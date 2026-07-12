import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { recordConsent, SIGNUP_REQUIRED } from "@/lib/consent";
import { db, schema } from "@/lib/db";
import { CONSENT_TERM_VERSION, type ConsentPurpose } from "@/lib/kyc-contracts";
import {
  createUserInMemory,
  findMemoryUserByCpf,
  findMemoryUserByEmail,
  validateRegisterInput,
} from "@/lib/register";
import { maskCpf } from "@/lib/crypto/vault-crypto";
import { onlyDigits } from "@/lib/validators/cpf-cnpj";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_ERROR = "Não foi possível concluir o cadastro. Tente novamente.";
const GENERIC_CONFLICT = "Não foi possível concluir o cadastro com esses dados.";

type ConsentBody = {
  termos_uso?: boolean;
  privacidade?: boolean;
  comunicacao?: boolean;
  marketing?: boolean;
  documentos?: boolean;
  biometria?: boolean;
};

function clientMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent");
  return { ip, userAgent };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: GENERIC_ERROR }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: GENERIC_ERROR }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const validation = validateRegisterInput({
    name: b.name,
    email: b.email,
    phone: b.phone,
    cpf: b.cpf,
    password: b.password,
  });

  if (!validation.ok) {
    // Generic client message — do not leak field-level detail that helps enumeration
    return Response.json(
      { ok: false, error: "Verifique os dados informados e tente novamente." },
      { status: 400 },
    );
  }

  const consents = (b.consents && typeof b.consents === "object" ? b.consents : {}) as ConsentBody;
  if (!consents.termos_uso || !consents.privacidade) {
    return Response.json(
      { ok: false, error: "É necessário aceitar os Termos de Uso e a Política de Privacidade." },
      { status: 400 },
    );
  }

  const { data } = validation;
  const { ip, userAgent } = clientMeta(req);

  // Conflict checks (generic error — no email/CPF enumeration)
  if (findMemoryUserByEmail(data.email) || findMemoryUserByCpf(data.cpf)) {
    console.info("[api/register] conflict memory", maskCpf(data.cpf));
    return Response.json({ ok: false, error: GENERIC_CONFLICT }, { status: 409 });
  }

  if (db) {
    try {
      const byEmail = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, data.email))
        .limit(1);
      if (byEmail[0]) {
        console.info("[api/register] conflict email db");
        return Response.json({ ok: false, error: GENERIC_CONFLICT }, { status: 409 });
      }
      const byCpf = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.cpf, data.cpf))
        .limit(1);
      if (byCpf[0]) {
        console.info("[api/register] conflict cpf db", maskCpf(data.cpf));
        return Response.json({ ok: false, error: GENERIC_CONFLICT }, { status: 409 });
      }
    } catch {
      // DB check failed — continue with memory path
    }
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(data.password);
  } catch {
    return Response.json({ ok: false, error: GENERIC_ERROR }, { status: 500 });
  }

  let userId: string;

  if (db) {
    try {
      const id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      await db.insert(schema.users).values({
        id,
        name: data.name,
        email: data.email,
        passwordHash,
        role: "user",
        phone: data.phone,
        cpf: onlyDigits(data.cpf),
        verificationStatus: "nao_verificado",
        onboardingStep: "dados",
      });
      userId = id;
      // Mirror in memory for session-less local helpers
      createUserInMemory({
        id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        passwordHash,
      });
    } catch (err) {
      console.info("[api/register] db insert failed, falling back to memory");
      const created = createUserInMemory({
        name: data.name,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        passwordHash,
      });
      if (!created.ok) {
        return Response.json({ ok: false, error: GENERIC_CONFLICT }, { status: 409 });
      }
      userId = created.user.id;
    }
  } else {
    const created = createUserInMemory({
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      passwordHash,
    });
    if (!created.ok) {
      return Response.json({ ok: false, error: GENERIC_CONFLICT }, { status: 409 });
    }
    userId = created.user.id;
  }

  // Record consents (required + optional)
  const toGrant: ConsentPurpose[] = [...SIGNUP_REQUIRED];
  if (consents.comunicacao) toGrant.push("comunicacao");
  if (consents.marketing) toGrant.push("marketing");
  if (consents.documentos) toGrant.push("documentos");
  if (consents.biometria) toGrant.push("biometria");

  for (const purpose of toGrant) {
    try {
      await recordConsent({
        userId,
        purpose,
        granted: true,
        termVersion: CONSENT_TERM_VERSION,
        ip,
        userAgent,
      });
    } catch {
      // Consent persistence failure should not block signup after user exists
      console.info("[api/register] consent record failed for", purpose);
    }
  }

  console.info("[api/register] ok", userId, maskCpf(data.cpf));
  return Response.json({ ok: true, userId }, { status: 201 });
}
