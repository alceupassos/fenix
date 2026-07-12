import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";
import type { KycLivenessMode } from "@/lib/kyc-contracts";
import { getKycProvider } from "@/lib/kyc/provider";
import { createKycSession, updateKycSession } from "@/lib/kyc/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set<KycLivenessMode>(["passive", "active", "video_fallback", "webauthn"]);

/**
 * POST { mode, challenge?, sessionId? } — runs provider.liveness.
 * Does not accept raw image/video bodies.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { mode?: string; challenge?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const mode = body.mode as KycLivenessMode;
  if (!MODES.has(mode)) {
    return NextResponse.json(
      { error: "invalid-mode", allowed: [...MODES] },
      { status: 400 },
    );
  }

  const userId = session.user.id ?? session.user.email ?? "unknown";
  const provider = getKycProvider();

  try {
    const result = await provider.liveness({
      mode,
      challenge: body.challenge,
    });

    if (body.sessionId) {
      updateKycSession(body.sessionId, {
        status: result.status,
        livenessScore: result.livenessScore,
        band: result.band,
        requiresLawyerReview: result.requiresLawyerReview,
        lastLivenessMode: mode,
      });
    } else {
      createKycSession({
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
        lastLivenessMode: mode,
      });
    }

    appendAudit({
      actor: session.user.email ?? userId,
      agent: "kyc",
      action: "liveness",
      entityType: "kyc_session",
      entityId: body.sessionId ?? result.sessionId,
      band: result.band,
      requiresLawyerReview: result.requiresLawyerReview,
      payload: {
        mode,
        provider: result.provider,
        status: result.status,
        livenessScore: result.livenessScore,
        // no media
      },
    });

    return NextResponse.json({
      ok: true,
      ...result,
      note: "Prova de vida não autoriza atos jurídicos sozinha — revisão via Botão Fênix quando cabível.",
    });
  } catch {
    return NextResponse.json({ error: "liveness-failed" }, { status: 502 });
  }
}
