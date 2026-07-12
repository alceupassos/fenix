import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";
import { getKycProvider } from "@/lib/kyc/provider";
import { createKycSession, updateKycSession } from "@/lib/kyc/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST face match — scores/metadata only (no raw images).
 * Results never auto-approve legal acts alone (Botão Fênix).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    selfieMetaId?: string;
    documentMetaId?: string;
    scores?: { face?: number };
    sessionId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  // Reject accidental raw payload keys
  const raw = body as Record<string, unknown>;
  if (raw.image || raw.selfie || raw.video || raw.base64 || raw.dataUrl) {
    return NextResponse.json(
      {
        error: "raw-media-rejected",
        message: "Não envie imagem/vídeo brutos. Use apenas metadados e scores.",
      },
      { status: 400 },
    );
  }

  const userId = session.user.id ?? session.user.email ?? "unknown";
  const provider = getKycProvider();

  try {
    const result = await provider.faceMatch({
      selfieMetaId: body.selfieMetaId,
      documentMetaId: body.documentMetaId,
      scores: body.scores,
    });

    // Force lawyer path awareness: never silent auto-approve for legal acts
    const requiresLawyerReview = true;

    if (body.sessionId) {
      updateKycSession(body.sessionId, {
        status: result.status,
        faceMatchScore: result.faceMatchScore,
        band: result.band === "verde" ? "amarela" : result.band,
        requiresLawyerReview,
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
        band: result.band === "verde" ? "amarela" : result.band,
        requiresLawyerReview,
      });
    }

    appendAudit({
      actor: session.user.email ?? userId,
      agent: "kyc",
      action: "face_match",
      entityType: "kyc_session",
      entityId: body.sessionId ?? result.sessionId,
      band: "amarela",
      requiresLawyerReview: true,
      payload: {
        provider: result.provider,
        status: result.status,
        faceMatchScore: result.faceMatchScore,
        selfieMetaId: body.selfieMetaId ?? null,
        documentMetaId: body.documentMetaId ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      sessionId: result.sessionId,
      status: result.status,
      faceMatchScore: result.faceMatchScore,
      livenessScore: result.livenessScore,
      band: "amarela",
      requiresLawyerReview: true,
      note: "Face match nunca aprova ato jurídico sozinho. Use o Botão Fênix para decisões com responsabilidade legal.",
    });
  } catch {
    return NextResponse.json({ error: "face-match-failed" }, { status: 502 });
  }
}
