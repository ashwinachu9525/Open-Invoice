import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/customers/:path*",
    "/settings/:path*",
    "/reports/:path*",
    "/ai/:path*",
    "/login",
    "/register",
  ],
}
