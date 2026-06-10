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
      }

      if (trigger === "update" || !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.companyId = dbUser.companyId
          token.passkeyPrompted = dbUser.passkeyPrompted
          token.passkeyEnabled = dbUser.passkeyEnabled
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.companyId = token.companyId
        session.user.passkeyPrompted = token.passkeyPrompted
        session.user.passkeyEnabled = token.passkeyEnabled
      }
      return session
    },
  },
})
