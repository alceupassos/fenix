import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyCredentials as verifyDemo, type DemoUser } from "@/lib/users";
import { verifyPassword } from "@/lib/auth/password";
import {
  dividas as mockDividas,
  prazos as mockPrazos,
  docs as mockDocs,
  reclamacoes as mockReclamacoes,
  casosData as mockCasos,
  type Divida,
  type Prazo,
  type Doc,
  type Reclamacao,
  type Etapa,
  type Caso,
} from "@/lib/data";
import type { VerificationStatus } from "@/lib/kyc-contracts";

/**
 * Data access with graceful fallback: when FENIX_DATABASE_URL is unset (or the
 * DB is unreachable) every function returns the same mock content the UI shipped
 * with, so the app keeps working. When the DB is present, it reads persisted rows.
 */

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "advogado";
  oab?: string;
  phone?: string;
  verificationStatus?: VerificationStatus;
  onboardingStep?: string;
};

async function passwordMatches(stored: string, plain: string): Promise<boolean> {
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return verifyPassword(plain, stored);
  }
  // Legacy plain demo hashes in DB / smoke
  return stored === plain;
}

export async function getUserForAuth(email: string, password: string): Promise<AuthUser | null> {
  if (db) {
    try {
      const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
      const u = rows[0];
      if (u && (await passwordMatches(u.passwordHash, password))) {
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as AuthUser["role"],
          oab: u.oab ?? undefined,
          phone: u.phone ?? undefined,
          verificationStatus: (u.verificationStatus as VerificationStatus) ?? "nao_verificado",
          onboardingStep: u.onboardingStep ?? "dados",
        };
      }
      if (u) return null; // found but wrong password
      // fall through to demo if not found in DB
    } catch {
      // DB unreachable → demo fallback
    }
  }
  // In-memory users from POST /api/register (bcrypt hashes)
  try {
    const { findMemoryUserByEmail } = await import("@/lib/register");
    const mem = findMemoryUserByEmail(email);
    if (mem && (await passwordMatches(mem.passwordHash, password))) {
      return {
        id: mem.id,
        name: mem.name,
        email: mem.email,
        role: "user",
        phone: mem.phone,
        verificationStatus: mem.verificationStatus,
        onboardingStep: mem.onboardingStep,
      };
    }
    if (mem) return null;
  } catch {
    // register module unavailable
  }

  const demo: DemoUser | null = verifyDemo(email, password);
  return demo
    ? {
        id: demo.id,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        oab: demo.oab,
        verificationStatus: "nao_verificado",
        onboardingStep: "dados",
      }
    : null;
}

export type Dashboard = { dividas: Divida[]; prazos: Prazo[]; docs: Doc[]; reclamacoes: Reclamacao[] };

const mockDashboard: Dashboard = {
  dividas: mockDividas,
  prazos: mockPrazos,
  docs: mockDocs,
  reclamacoes: mockReclamacoes,
};

export async function getDashboard(email?: string | null): Promise<Dashboard> {
  if (!db || !email) return mockDashboard;
  try {
    const users = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    const uid = users[0]?.id;
    if (!uid) return mockDashboard;

    const [dRows, pRows, docRows, cRows] = await Promise.all([
      db.select().from(schema.debts).where(eq(schema.debts.userId, uid)).orderBy(asc(schema.debts.ord)),
      db.select().from(schema.deadlines).where(eq(schema.deadlines.userId, uid)).orderBy(asc(schema.deadlines.ord)),
      db.select().from(schema.documents).where(eq(schema.documents.userId, uid)).orderBy(asc(schema.documents.ord)),
      db.select().from(schema.complaints).where(eq(schema.complaints.userId, uid)).orderBy(asc(schema.complaints.ord)),
    ]);

    if (!dRows.length && !pRows.length && !docRows.length && !cRows.length) return mockDashboard;

    return {
      dividas: dRows.map((d) => ({
        credor: d.credor, tipo: d.tipo, valor: d.valor, detalhe: d.detalhe,
        status: d.status, tagBg: d.tagBg, tagColor: d.tagColor, acao: d.acao,
      })),
      prazos: pRows.map((p) => ({
        dia: p.dia, mes: p.mes, titulo: p.titulo, desc: p.descricao, chip: p.chip,
        dataBg: p.dataBg, dataColor: p.dataColor, tagBg: p.tagBg, tagColor: p.tagColor,
      })),
      docs: docRows.map((dc) => ({ nome: dc.nome, status: dc.status, tagBg: dc.tagBg, tagColor: dc.tagColor })),
      reclamacoes: cRows.map((rc) => ({
        titulo: rc.titulo, canal: rc.canal, protocolo: rc.protocolo, status: rc.status,
        tagBg: rc.tagBg, tagColor: rc.tagColor, etapas: rc.etapas as Etapa[],
      })),
    };
  } catch {
    return mockDashboard;
  }
}

export async function getCases(): Promise<Caso[]> {
  if (!db) return mockCasos;
  try {
    const rows = await db.select().from(schema.cases).orderBy(asc(schema.cases.ord));
    if (!rows.length) return mockCasos;
    return rows.map((c) => ({
      nome: c.nome, materia: c.materia, prazo: c.prazo, chip: c.chip, chipBg: c.chipBg, chipColor: c.chipColor,
      titulo: c.titulo, sub: c.sub, prazoChip: c.prazoChip, resumo: c.resumo, minutaTitulo: c.minutaTitulo, minuta: c.minuta,
    }));
  } catch {
    return mockCasos;
  }
}

/** Record a checkout as a subscription/package purchase (AbacatePay primary; Stripe legacy). */
export async function recordSubscription(input: {
  email: string;
  plan: "assinatura" | "pacote";
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  abacateCustomerId?: string;
  abacateBillingId?: string;
  abacateCheckoutId?: string;
}): Promise<void> {
  if (!db) return;
  try {
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, input.email.toLowerCase()))
      .limit(1);
    const uid = users[0]?.id;
    if (!uid) return;
    await db.insert(schema.subscriptions).values({
      userId: uid,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      abacateCustomerId: input.abacateCustomerId,
      abacateBillingId: input.abacateBillingId,
      abacateCheckoutId: input.abacateCheckoutId,
    });
  } catch {
    // best-effort
  }
}

/** Idempotent payment webhook events. Returns false if already processed. */
export async function claimPaymentEvent(input: {
  id: string;
  provider?: string;
  type: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  if (!db) return true;
  try {
    await db.insert(schema.paymentEvents).values({
      id: input.id,
      provider: input.provider ?? "abacatepay",
      type: input.type,
      payload: input.payload ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Alias for webhook routes — returns "new" | "duplicate". */
export async function recordPaymentEvent(input: {
  id: string;
  provider?: string;
  type: string;
  payload?: unknown;
}): Promise<"new" | "duplicate"> {
  const ok = await claimPaymentEvent({
    id: input.id,
    provider: input.provider,
    type: input.type,
    payload:
      input.payload && typeof input.payload === "object"
        ? (input.payload as Record<string, unknown>)
        : undefined,
  });
  return ok ? "new" : "duplicate";
}

export type RegisterUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  cpf?: string;
};

export async function createUser(input: RegisterUserInput): Promise<string | null> {
  if (!db) return null;
  try {
    const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(schema.users).values({
      id,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: "user",
      phone: input.phone,
      cpf: input.cpf,
      verificationStatus: "nao_verificado",
      onboardingStep: "dados",
    });
    return id;
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  email: string,
  patch: { onboardingStep?: string; phone?: string; verificationStatus?: VerificationStatus },
): Promise<boolean> {
  if (!db) return false;
  try {
    await db
      .update(schema.users)
      .set({
        ...(patch.onboardingStep ? { onboardingStep: patch.onboardingStep } : {}),
        ...(patch.phone ? { phone: patch.phone } : {}),
        ...(patch.verificationStatus ? { verificationStatus: patch.verificationStatus } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.email, email.toLowerCase()));
    return true;
  } catch {
    return false;
  }
}
