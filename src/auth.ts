import "server-only"
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import Passkey from "next-auth/providers/passkey"
import * as argon2 from "argon2"
import { Role } from "@prisma/client"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  experimental: { enableWebAuthn: true },
  logger: {
    warn: (code) => {
      // Suppress the experimental WebAuthn warning that constantly floods the terminal
      if (code === "experimental-webauthn" || String(code).includes("experimental-webauthn")) return
      console.warn(code)
    },
  },
  providers: [
    // ── Google OAuth ─────────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // ── Apple Sign In ─────────────────────────────────────────────────────
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
          }),
        ]
      : []),

    // ── Passkey (WebAuthn — fingerprint / Face ID / hardware key) ─────────
    Passkey,

    // ── Email / Password ──────────────────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpToken: { label: "Authenticator Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string, deletedAt: null },
        })

        if (!user || !user.password) return null

        const isValid = await argon2.verify(
          user.password,
          credentials.password as string
        )

        if (!isValid) return null

        if (!user.emailVerified) {
          throw new Error("Please verify your email address before logging in.")
        }

        if (user.mfaEnabled && user.mfaSecret) {
          if (!credentials.totpToken || credentials.totpToken === "undefined") {
            throw new Error("MFA_REQUIRED")
          }
          const { verifySync } = await import("otplib")
          const isTotpValid = verifySync({
            token: credentials.totpToken as string,
            secret: user.mfaSecret,
          })
          if (!isTotpValid) {
            throw new Error("Invalid authenticator code.")
          }
        }

        return user
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (existing && !existing.emailVerified) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date() },
          })
        }
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!
        token.role = (user as { role: Role }).role ?? Role.BUSINESS_OWNER
        token.companyId = (user as { companyId?: string }).companyId
        token.passkeyPrompted = (user as any).passkeyPrompted
        token.passkeyEnabled = (user as any).passkeyEnabled
        token.mfaEnabled = (user as any).mfaEnabled
      }

      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.companyId = dbUser.companyId
          token.passkeyPrompted = dbUser.passkeyPrompted
          token.passkeyEnabled = dbUser.passkeyEnabled
          token.mfaEnabled = dbUser.mfaEnabled
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.companyId = token.companyId as string
        session.user.passkeyPrompted = token.passkeyPrompted as boolean
        session.user.passkeyEnabled = token.passkeyEnabled as boolean
        ;(session.user as any).mfaEnabled = token.mfaEnabled as boolean
      }
      return session
    },
  },
})
