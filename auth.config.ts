import type { NextAuthConfig } from "next-auth";
import type { FenixRole } from "@/types/next-auth";

/**
 * Edge-safe config shared between middleware and the full auth setup.
 * No providers that need Node APIs live here.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.oab = user.oab;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as FenixRole | undefined;
        session.user.oab = token.oab as string | undefined;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
