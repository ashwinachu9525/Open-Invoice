import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register") ||
        request.nextUrl.pathname.startsWith("/forgot-password") ||
        request.nextUrl.pathname.startsWith("/reset-password")

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl))
        }
        return true
      }
      if (
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/invoices") ||
        request.nextUrl.pathname.startsWith("/customers") ||
        request.nextUrl.pathname.startsWith("/settings") ||
        request.nextUrl.pathname.startsWith("/reports") ||
        request.nextUrl.pathname.startsWith("/ai")
      ) {
        return isLoggedIn
      }
      return true
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
} satisfies NextAuthConfig
