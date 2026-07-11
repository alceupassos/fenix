import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { getUserForAuth } from "@/lib/repo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;
        // Reads from the DB when available, otherwise the demo directory.
        const user = await getUserForAuth(email, password);
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, oab: user.oab };
      },
    }),
  ],
});
