/**
 * Mock KYC provider — works without API keys.
 * Always band amarela for legal use (human review never skipped).
 */

import type { KycLivenessMode, KycProviderResult } from "@/lib/kyc-contracts";
import type { KycProvider } from "./provider";

function randomSessionId(): string {
  return `kyc_mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const FACE = 0.92;
const LIVENESS = 0.88;

function baseResult(
  overrides: Partial<KycProviderResult> & Pick<KycProviderResult, "sessionId">,
): KycProviderResult {
  return {
    provider: "mock",
    status: "mock_pass",
    faceMatchScore: FACE,
    livenessScore: LIVENESS,
    band: "amarela",
    requiresLawyerReview: true,
    ...overrides,
  };
}

export class MockKycProvider implements KycProvider {
  readonly name = "mock";

  async verifyIdentity(input: {
    userId: string;
    expectedName?: string;
    callbackUrl?: string;
  }): Promise<KycProviderResult & { url?: string }> {
    const sessionId = randomSessionId();
    const url = input.callbackUrl
      ? `${input.callbackUrl}${input.callbackUrl.includes("?") ? "&" : "?"}sessionId=${encodeURIComponent(sessionId)}&status=mock_pass`
      : undefined;

    return {
      ...baseResult({
        sessionId,
        status: "mock_pass",
        faceMatchScore: FACE,
        livenessScore: LIVENESS,
        raw: {
          expectedName: input.expectedName ?? null,
          userId: input.userId,
          note: "Mock KYC — sem envio de biometria a terceiros",
        },
      }),
      url,
    };
  }

  async faceMatch(input: {
    selfieMetaId?: string;
    documentMetaId?: string;
    scores?: { face?: number };
  }): Promise<KycProviderResult> {
    const score =
      typeof input.scores?.face === "number" && Number.isFinite(input.scores.face)
        ? Math.min(1, Math.max(0, input.scores.face))
        : FACE;

    return baseResult({
      sessionId: randomSessionId(),
      status: "mock_pass",
      faceMatchScore: score,
      livenessScore: null,
      raw: {
        selfieMetaId: input.selfieMetaId ?? null,
        documentMetaId: input.documentMetaId ?? null,
        // never include image bytes
      },
    });
  }

  async liveness(input: {
    mode: KycLivenessMode;
    challenge?: string;
  }): Promise<KycProviderResult> {
    return baseResult({
      sessionId: randomSessionId(),
      status: "mock_pass",
      faceMatchScore: null,
      livenessScore: LIVENESS,
      raw: {
        mode: input.mode,
        challengePresent: Boolean(input.challenge),
      },
    });
  }
}
