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
import { sendWelcomeEmail } from "@/services/smtp"
import { getSystemConfig } from "@/lib/system-config"


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
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        if (user.isBlocked) {
          throw new Error("Your account has been blocked by the administrator.")
        }

        const isValid = await argon2.verify(
          user.password,
          credentials.password as string
        )

        if (!isValid) return null

        const config = await getSystemConfig()
        if (config.requireEmailVerification && !user.emailVerified) {
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
      if (user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        })
        
        if (existing) {
          if (existing.isBlocked) {
            // Throwing an error here will redirect to the error page with ?error=AccessDenied by default,
            // or if we throw a custom error string, it might be visible.
            throw new Error("Your account has been blocked by the administrator. Please contact us.")
          }

          const dataToUpdate: any = {}
          
          if (account?.provider === "google" && !existing.emailVerified) {
            dataToUpdate.emailVerified = new Date()
          }
          
          if (existing.deletedAt) {
            dataToUpdate.deletedAt = null
          }

          if (Object.keys(dataToUpdate).length > 0) {
            await prisma.user.update({
              where: { id: existing.id },
              data: dataToUpdate,
            })
          }
        } else {
          // New OAuth user: block if registration is closed
          const config = await getSystemConfig()
          if (!config.registrationOpen) {
            throw new Error("Registration is currently closed by the administrator.")
          }
        }
      }
      return true
    },
    async jwt({ token, user, trigger, account }) {
      // When a user signs in (account is available) or triggers an update, fetch fresh DB data
      if (account || user || trigger === "update") {
        const email = token.email ?? user?.email
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.companyId = dbUser.companyId
            token.passkeyPrompted = dbUser.passkeyPrompted
            token.passkeyEnabled = dbUser.passkeyEnabled
            token.mfaEnabled = dbUser.mfaEnabled
            token.hasSeenTour = dbUser.hasSeenTour
          }
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
        ;(session.user as any).hasSeenTour = token.hasSeenTour as boolean
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id && user.name && user.email) {
        // Create a default company for the newly created OAuth user
        const company = await prisma.company.create({
          data: { name: `${user.name}'s Business` },
        })

        // Link the company to the user and mark email as verified (since it's from Google)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            companyId: company.id,
            role: Role.BUSINESS_OWNER,
            emailVerified: new Date(),
          },
        })

        // Send a welcome email
        try {
          await sendWelcomeEmail(user.email, user.name)
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError)
        }
      }
    },
  },
})
