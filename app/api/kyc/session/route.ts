import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";
import { RETENTION_DAYS } from "@/lib/kyc-contracts";
import { getKycProvider } from "@/lib/kyc/provider";
import {
  createKycSession,
  deleteKycSession,
  deleteKycSessionsForUser,
  getKycSession,
  getKycSessionsForUser,
} from "@/lib/kyc/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — start KYC session (requires consentBiometria=true).
 * GET  — status for sessionId or list for current user.
 * DELETE — LGPD exclusão of biometric/session data.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    consentBiometria?: boolean;
    expectedName?: string;
    callbackUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  if (body.consentBiometria !== true) {
    return NextResponse.json(
      {
        error: "consent-required",
        message: "Consentimento de biometria (LGPD art. 11) é obrigatório para iniciar KYC.",
      },
      { status: 400 },
    );
  }

  const userId = session.user.id ?? session.user.email ?? "unknown";
  const provider = getKycProvider();

  try {
    const result = await provider.verifyIdentity({
      userId,
      expectedName: body.expectedName ?? session.user.name ?? undefined,
      callbackUrl: body.callbackUrl,
    });

    const rec = createKycSession({
      sessionId: result.sessionId,
      userId,
      provider: result.provider,
      consentBiometria: true,
      consentAt: new Date().toISOString(),
      status: result.status,
      faceMatchScore: result.faceMatchScore,
      livenessScore: result.livenessScore,
      band: result.band,
      requiresLawyerReview: result.requiresLawyerReview,
      providerUrl: result.url,
      meta: {
        // never store raw images
        hasUrl: Boolean(result.url),
      },
    });

    appendAudit({
      actor: session.user.email ?? userId,
      agent: "kyc",
      action: "session_start",
      entityType: "kyc_session",
      entityId: rec.sessionId,
      band: rec.band ?? "amarela",
      requiresLawyerReview: true,
      payload: {
        provider: rec.provider,
        consentBiometria: true,
        // no biometrics in audit
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: rec.sessionId,
      provider: rec.provider,
      status: rec.status,
      band: rec.band,
      requiresLawyerReview: rec.requiresLawyerReview,
      url: result.url,
      faceMatchScore: rec.faceMatchScore,
      livenessScore: rec.livenessScore,
      retentionDays: RETENTION_DAYS.kycSession,
      note: "Resultados de identidade não executam atos jurídicos sozinhos — Botão Fênix quando aplicável.",
    });
  } catch {
    return NextResponse.json({ error: "kyc-session-failed" }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id ?? session.user.email ?? "unknown";
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const rec = getKycSession(sessionId);
    if (!rec || rec.userId !== userId) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      session: {
        sessionId: rec.sessionId,
        provider: rec.provider,
        status: rec.status,
        band: rec.band,
        faceMatchScore: rec.faceMatchScore,
        livenessScore: rec.livenessScore,
        requiresLawyerReview: rec.requiresLawyerReview,
        createdAt: rec.createdAt,
        expiresAt: rec.expiresAt,
        providerUrl: rec.providerUrl,
        consentBiometria: rec.consentBiometria,
      },
    });
  }

  const list = getKycSessionsForUser(userId).map((rec) => ({
    sessionId: rec.sessionId,
    provider: rec.provider,
    status: rec.status,
    band: rec.band,
    faceMatchScore: rec.faceMatchScore,
    livenessScore: rec.livenessScore,
    requiresLawyerReview: rec.requiresLawyerReview,
    createdAt: rec.createdAt,
    expiresAt: rec.expiresAt,
  }));

  return NextResponse.json({ ok: true, sessions: list });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id ?? session.user.email ?? "unknown";
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const all = searchParams.get("all") === "1" || searchParams.get("all") === "true";

  let deleted = 0;
  if (all) {
    deleted = deleteKycSessionsForUser(userId);
  } else if (sessionId) {
    const rec = getKycSession(sessionId);
    if (!rec || rec.userId !== userId) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }
    deleted = deleteKycSession(sessionId) ? 1 : 0;
  } else {
    return NextResponse.json(
      { error: "sessionId-or-all-required", message: "Informe sessionId ou all=1" },
      { status: 400 },
    );
  }

  appendAudit({
    actor: session.user.email ?? userId,
    agent: "kyc",
    action: "session_erase",
    entityType: "kyc_session",
    entityId: sessionId ?? "all",
    band: "amarela",
    payload: { deleted, lgpd: true },
  });

  return NextResponse.json({
    ok: true,
    deleted,
    message: "Dados biométricos/sessão KYC excluídos deste processo (LGPD).",
  });
}
