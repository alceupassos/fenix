import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  findMemoryUserByEmail,
  findMemoryUserById,
  isValidBrPhone,
  toPublicProfile,
  updateMemoryUser,
  type OnboardingStep,
} from "@/lib/register";
import { onlyDigits } from "@/lib/validators/cpf-cnpj";
import { maskCpf } from "@/lib/crypto/vault-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONBOARDING_STEPS: OnboardingStep[] = ["dados", "documentos", "facial", "pronto"];

function isOnboardingStep(v: unknown): v is OnboardingStep {
  return typeof v === "string" && (ONBOARDING_STEPS as string[]).includes(v);
}

async function resolveSessionUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const email = session.user.email.toLowerCase();
  const id = session.user.id;

  // Prefer memory (fresh registrations in dev without DB)
  if (id) {
    const byId = findMemoryUserById(id);
    if (byId) return byId;
  }
  const byEmail = findMemoryUserByEmail(email);
  if (byEmail) return byEmail;

  if (db) {
    try {
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      const u = rows[0];
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? "",
        cpf: u.cpf ?? "",
        passwordHash: u.passwordHash,
        role: "user" as const,
        verificationStatus: (u.verificationStatus ?? "nao_verificado") as
          | "nao_verificado"
          | "pendente"
          | "verificado"
          | "reprovado",
        onboardingStep: (u.onboardingStep ?? "dados") as OnboardingStep,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const user = await resolveSessionUser();
  if (!user) {
    // Session exists but no profile row (e.g. demo user) — return session projection
    return Response.json({
      ok: true,
      profile: {
        id: session.user.id ?? null,
        name: session.user.name ?? null,
        email: session.user.email,
        phone: null,
        cpfMasked: null,
        role: session.user.role ?? "user",
        verificationStatus: "nao_verificado",
        onboardingStep: "dados",
        createdAt: null,
        updatedAt: null,
      },
    });
  }

  return Response.json({ ok: true, profile: toPublicProfile(user) });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Never trust userId from body — resolve from session only
  const user = await resolveSessionUser();
  if (!user) {
    return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
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
  // Ignore any client-supplied userId
  void b.userId;

  const patch: { phone?: string; onboardingStep?: OnboardingStep } = {};

  if (b.phone !== undefined) {
    if (typeof b.phone !== "string" || !isValidBrPhone(b.phone)) {
      return Response.json({ error: "Telefone inválido." }, { status: 400 });
    }
    patch.phone = onlyDigits(b.phone);
  }

  if (b.onboardingStep !== undefined) {
    if (!isOnboardingStep(b.onboardingStep)) {
      return Response.json({ error: "Etapa inválida." }, { status: 400 });
    }
    patch.onboardingStep = b.onboardingStep;
  }

  if (!Object.keys(patch).length) {
    return Response.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  // Memory update
  updateMemoryUser(user.id, patch);

  if (db) {
    try {
      await db
        .update(schema.users)
        .set({
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.onboardingStep !== undefined ? { onboardingStep: patch.onboardingStep } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));
    } catch {
      console.info("[api/profile] db update failed", user.id);
    }
  }

  const refreshed = findMemoryUserById(user.id) ?? {
    ...user,
    ...patch,
    updatedAt: new Date(),
  };

  console.info(
    "[api/profile] patched",
    user.id,
    user.cpf ? maskCpf(user.cpf) : "***",
    patch.onboardingStep ?? "",
  );

  return Response.json({ ok: true, profile: toPublicProfile(refreshed) });
}
