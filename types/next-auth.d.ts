import type { DefaultSession } from "next-auth";

export type FenixRole = "user" | "advogado";

declare module "next-auth" {
  interface User {
    role?: FenixRole;
    oab?: string;
  }
  interface Session {
    user: {
      role?: FenixRole;
      oab?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: FenixRole;
    oab?: string;
  }
}
