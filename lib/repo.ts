import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyCredentials as verifyDemo, type DemoUser } from "@/lib/users";
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

/**
 * Data access with graceful fallback: when FENIX_DATABASE_URL is unset (or the
 * DB is unreachable) every function returns the same mock content the UI shipped
 * with, so the app keeps working. When the DB is present, it reads persisted rows.
 */

export type AuthUser = { id: string; name: string; email: string; role: "user" | "advogado"; oab?: string };

export async function getUserForAuth(email: string, password: string): Promise<AuthUser | null> {
  if (db) {
    try {
      const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
      const u = rows[0];
      if (u && u.passwordHash === password) {
        return { id: u.id, name: u.name, email: u.email, role: u.role as AuthUser["role"], oab: u.oab ?? undefined };
      }
      if (u) return null; // found but wrong password
      // fall through to demo if not found in DB
    } catch {
      // DB unreachable → demo fallback
    }
  }
  const demo: DemoUser | null = verifyDemo(email, password);
  return demo ? { id: demo.id, name: demo.name, email: demo.email, role: demo.role, oab: demo.oab } : null;
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

/** Stripe: record a checkout as a subscription/package purchase for a user. */
export async function recordSubscription(input: {
  email: string;
  plan: "assinatura" | "pacote";
  status: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
}): Promise<void> {
  if (!db) return;
  try {
    const users = await db.select().from(schema.users).where(eq(schema.users.email, input.email.toLowerCase())).limit(1);
    const uid = users[0]?.id;
    if (!uid) return;
    await db.insert(schema.subscriptions).values({
      userId: uid,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    });
  } catch {
    // best-effort
  }
}
