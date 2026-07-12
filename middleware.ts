import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Gates the authenticated areas:
 * - /painel   → any signed-in user
 * - /advogado → only role "advogado"
 * Unauthenticated users are sent to /login with a callbackUrl.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);
  const role = req.auth?.user?.role;

  if (!isLoggedIn) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (nextUrl.pathname.startsWith("/advogado") && role !== "advogado") {
    return NextResponse.redirect(new URL("/painel", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/painel/:path*",
    "/advogado/:path*",
    "/nucleos/:path*",
    "/onboarding/:path*",
    "/kyc/:path*",
  ],
};
