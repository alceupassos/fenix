import type { FenixRole } from "@/types/next-auth";

/**
 * Demo user directory. Phase 4 replaces this with a Postgres-backed store
 * (and hashed passwords). For now these are plain demo credentials.
 */
export type DemoUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: FenixRole;
  oab?: string;
};

export const DEMO_USERS: DemoUser[] = [
  { id: "u_marina", name: "Marina", email: "marina@fenix.com.br", password: "fenix123", role: "user" },
  {
    id: "a_leandro",
    name: "Dr. Leandro Giannasi",
    email: "leandro@fenix.com.br",
    password: "fenix123",
    role: "advogado",
    oab: "OAB/SP 211.304",
  },
];

export function verifyCredentials(email?: unknown, password?: unknown): DemoUser | null {
  if (typeof email !== "string" || typeof password !== "string") return null;
  const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) return null;
  return user;
}
