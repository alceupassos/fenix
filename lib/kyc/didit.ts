/**
 * Didit KYC adapter — https://verification.didit.me/v3
 * NEVER stores raw selfie/video from Didit; only scores + status.
 */

import type { KycLivenessMode, KycProviderResult } from "@/lib/kyc-contracts";
import type { KycProvider } from "./provider";

const DIDIT_BASE = "https://verification.didit.me/v3";

/** In-memory workflow cache (process lifetime). */
let cachedWorkflowId: string | null = null;

function apiKey(): string {
  const key = process.env.DIDIT_API_KEY?.trim();
  if (!key) throw new Error("DIDIT_API_KEY not configured");
  return key;
}

function headers(): HeadersInit {
  return {
    "x-api-key": apiKey(),
    "Content-Type": "application/json",
  };
}

function normScore(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  // Didit often returns 0–100; contract uses 0–1
  return v > 1 ? Math.min(1, v / 100) : Math.min(1, Math.max(0, v));
}

function mapDecision(sessionId: string, decision: Record<string, unknown>): KycProviderResult {
  const statusRaw = String(decision.status ?? "pending");
  const livenessChecks = Array.isArray(decision.liveness_checks)
    ? (decision.liveness_checks as Record<string, unknown>[])
    : [];
  const faceMatches = Array.isArray(decision.face_matches)
    ? (decision.face_matches as Record<string, unknown>[])
    : [];

  const livenessScore = normScore(livenessChecks[0]?.score);
  const faceMatchScore = normScore(faceMatches[0]?.score);

  if (statusRaw === "Approved") {
    const strong =
      (faceMatchScore == null || faceMatchScore >= 0.85) &&
      (livenessScore == null || livenessScore >= 0.8);
    return {
      provider: "didit",
      sessionId,
      status: "pass",
      faceMatchScore,
      livenessScore,
      band: strong ? "verde" : "amarela",
      requiresLawyerReview: !strong,
      raw: {
        diditStatus: statusRaw,
        features: decision.features ?? null,
        warningsCount: Array.isArray(decision.warnings) ? decision.warnings.length : 0,
        // no id_verifications images / selfie blobs
      },
    };
  }

  if (statusRaw === "Declined") {
    return {
      provider: "didit",
      sessionId,
      status: "fail",
      faceMatchScore,
      livenessScore,
      band: "vermelha",
      requiresLawyerReview: true,
      raw: { diditStatus: statusRaw },
    };
  }

  if (statusRaw === "In Review") {
    return {
      provider: "didit",
      sessionId,
      status: "review",
      faceMatchScore,
      livenessScore,
      band: "amarela",
      requiresLawyerReview: true,
      raw: { diditStatus: statusRaw },
    };
  }

  return {
    provider: "didit",
    sessionId,
    status: "pending",
    faceMatchScore,
    livenessScore,
    band: "amarela",
    requiresLawyerReview: true,
    raw: { diditStatus: statusRaw },
  };
}

async function ensureWorkflowId(): Promise<string> {
  const fromEnv = process.env.DIDIT_WORKFLOW_ID?.trim();
  if (fromEnv) {
    cachedWorkflowId = fromEnv;
    return fromEnv;
  }
  if (cachedWorkflowId) return cachedWorkflowId;

  const res = await fetch(`${DIDIT_BASE}/workflows/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      workflow_label: "Sociedade Fênix KYC",
      workflow_type: "kyc",
      is_liveness_enabled: true,
      is_face_match_enabled: true,
      face_match_score_decline_threshold: 50,
      max_retry_attempts: 3,
    }),
  });

  if (!res.ok) {
    throw new Error(`didit-workflow-failed:${res.status}`);
  }

  const data = (await res.json()) as { uuid?: string };
  if (!data.uuid) throw new Error("didit-workflow-missing-uuid");
  cachedWorkflowId = data.uuid;
  return data.uuid;
}

export async function getDiditDecision(sessionId: string): Promise<KycProviderResult> {
  const res = await fetch(`${DIDIT_BASE}/session/${encodeURIComponent(sessionId)}/decision/`, {
    method: "GET",
    headers: { "x-api-key": apiKey() },
  });
  if (!res.ok) {
    throw new Error(`didit-decision-failed:${res.status}`);
  }
  const decision = (await res.json()) as Record<string, unknown>;
  return mapDecision(sessionId, decision);
}

export class DiditKycProvider implements KycProvider {
  readonly name = "didit";

  async verifyIdentity(input: {
    userId: string;
    expectedName?: string;
    callbackUrl?: string;
  }): Promise<KycProviderResult & { url?: string }> {
    const workflow_id = await ensureWorkflowId();
    const body: Record<string, unknown> = {
      workflow_id,
      vendor_data: input.userId,
      language: "pt",
    };
    if (input.callbackUrl) body.callback = input.callbackUrl;
    if (input.expectedName) {
      const parts = input.expectedName.trim().split(/\s+/);
      body.expected_details = {
        first_name: parts[0],
        last_name: parts.slice(1).join(" ") || undefined,
      };
    }

    const res = await fetch(`${DIDIT_BASE}/session/`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`didit-session-failed:${res.status}`);
    }

    const data = (await res.json()) as {
      session_id?: string;
      url?: string;
      status?: string;
    };

    const sessionId = data.session_id ?? `didit_${Date.now().toString(36)}`;

    return {
      provider: "didit",
      sessionId,
      status: "pending",
      faceMatchScore: null,
      livenessScore: null,
      band: "amarela",
      requiresLawyerReview: true,
      url: data.url,
      raw: {
        diditStatus: data.status ?? "Not Started",
        // no media
      },
    };
  }

  async faceMatch(input: {
    selfieMetaId?: string;
    documentMetaId?: string;
    scores?: { face?: number };
  }): Promise<KycProviderResult> {
    // Hosted Didit flow does face match inside the session URL.
    // If caller already has a Didit session id in selfieMetaId, poll decision.
    if (input.selfieMetaId?.startsWith("didit") || (input.selfieMetaId && input.selfieMetaId.length > 20)) {
      try {
        return await getDiditDecision(input.selfieMetaId);
      } catch {
        // fall through to pending
      }
    }

    if (typeof input.scores?.face === "number") {
      const score = Math.min(1, Math.max(0, input.scores.face > 1 ? input.scores.face / 100 : input.scores.face));
      return {
        provider: "didit",
        sessionId: input.selfieMetaId ?? `didit_fm_${Date.now().toString(36)}`,
        status: score >= 0.5 ? "pass" : "fail",
        faceMatchScore: score,
        livenessScore: null,
        band: score >= 0.85 ? "verde" : score >= 0.5 ? "amarela" : "vermelha",
        requiresLawyerReview: score < 0.85,
      };
    }

    return {
      provider: "didit",
      sessionId: input.selfieMetaId ?? `didit_fm_${Date.now().toString(36)}`,
      status: "pending",
      faceMatchScore: null,
      livenessScore: null,
      band: "amarela",
      requiresLawyerReview: true,
      raw: {
        note: "Face match via fluxo hospedado Didit — use verifyIdentity.url ou getDiditDecision",
        documentMetaId: input.documentMetaId ?? null,
      },
    };
  }

  async liveness(input: {
    mode: KycLivenessMode;
    challenge?: string;
  }): Promise<KycProviderResult> {
    // Liveness is part of the hosted Didit session; local modes return pending guidance.
    return {
      provider: "didit",
      sessionId: `didit_liv_${Date.now().toString(36)}`,
      status: "pending",
      faceMatchScore: null,
      livenessScore: null,
      band: "amarela",
      requiresLawyerReview: true,
      raw: {
        mode: input.mode,
        challengePresent: Boolean(input.challenge),
        note: "Liveness nativo no workflow Didit — abra a URL de verifyIdentity",
      },
    };
  }
}
