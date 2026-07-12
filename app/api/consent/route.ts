import { auth } from "@/auth";
import {
  hasRequiredConsents,
  isConsentPurpose,
  listConsents,
  recordConsent,
  revokeConsent,
  DOCS_REQUIRED,
  KYC_REQUIRED,
  SIGNUP_REQUIRED,
} from "@/lib/consent";
import { CONSENT_TERM_VERSION } from "@/lib/kyc-contracts";
import { findMemoryUserByEmail, findMemoryUserById } from "@/lib/register";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  if (session.user.id) {
    const mem = findMemoryUserById(session.user.id);
    if (mem) return mem.id;
  }

  const byEmail = findMemoryUserByEmail(session.user.email);
  if (byEmail) return byEmail.id;

  if (db) {
    try {
      const rows = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, session.user.email.toLowerCase()))
        .limit(1);
      if (rows[0]) return rows[0].id;
    } catch {
      /* ignore */
    }
  }

  // Fall back to session id if present (demo users)
  return session.user.id ?? null;
}

function clientMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent");
  return { ip, userAgent };
}

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const items = await listConsents(userId);
  const [signupOk, docsOk, kycOk] = await Promise.all([
    hasRequiredConsents(userId, SIGNUP_REQUIRED),
    hasRequiredConsents(userId, DOCS_REQUIRED),
    hasRequiredConsents(userId, KYC_REQUIRED),
  ]);

  return Response.json({
    ok: true,
    termVersion: CONSENT_TERM_VERSION,
    required: {
      signup: SIGNUP_REQUIRED,
      documentos: DOCS_REQUIRED,
      kyc: KYC_REQUIRED,
    },
    status: {
      signup: signupOk,
      documentos: docsOk,
      kyc: kycOk,
    },
    consents: items.map((c) => ({
      id: c.id,
      purpose: c.purpose,
      granted: c.granted,
      termVersion: c.termVersion,
      grantedAt: c.grantedAt.toISOString(),
      revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
    })),
  });
}

/**
 * POST body:
 * { action: "grant" | "revoke", purpose: ConsentPurpose }
 * or batch: { action: "grant", purposes: ConsentPurpose[] }
 */
export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const action = b.action === "revoke" ? "revoke" : b.action === "grant" ? "grant" : null;
  if (!action) {
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  }

  const purposes: string[] = [];
  if (typeof b.purpose === "string") purposes.push(b.purpose);
  if (Array.isArray(b.purposes)) {
    for (const p of b.purposes) {
      if (typeof p === "string") purposes.push(p);
    }
  }

  if (!purposes.length) {
    return Response.json({ error: "Informe o consentimento." }, { status: 400 });
  }

  for (const p of purposes) {
    if (!isConsentPurpose(p)) {
      return Response.json({ error: "Finalidade inválida." }, { status: 400 });
    }
  }

  const { ip, userAgent } = clientMeta(req);
  const recorded = [];

  for (const purpose of purposes) {
    if (!isConsentPurpose(purpose)) continue;
    if (action === "revoke") {
      recorded.push(await revokeConsent(userId, purpose, { ip, userAgent }));
    } else {
      recorded.push(
        await recordConsent({
          userId,
          purpose,
          granted: true,
          termVersion: CONSENT_TERM_VERSION,
          ip,
          userAgent,
        }),
      );
    }
  }

  return Response.json({
    ok: true,
    termVersion: CONSENT_TERM_VERSION,
    consents: recorded.map((c) => ({
      id: c.id,
      purpose: c.purpose,
      granted: c.granted,
      termVersion: c.termVersion,
      grantedAt: c.grantedAt.toISOString(),
      revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
    })),
  });
}
