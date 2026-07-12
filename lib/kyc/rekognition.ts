/**
 * AWS Rekognition stub adapter.
 * When configured, returns pending (full CompareFaces/DetectFaces TBD).
 * Optional mock-like fallback if AWS keys missing and FALLBACK_TO_MOCK=1.
 */

import type { KycLivenessMode, KycProviderResult } from "@/lib/kyc-contracts";
import { MockKycProvider } from "./mock";
import type { KycProvider } from "./provider";

function hasAwsKeys(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
}

function randomSessionId(): string {
  return `kyc_rek_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pendingResult(note: string): KycProviderResult {
  return {
    provider: "rekognition",
    sessionId: randomSessionId(),
    status: "pending",
    faceMatchScore: null,
    livenessScore: null,
    band: "amarela",
    requiresLawyerReview: true,
    raw: { note },
  };
}

export class RekognitionKycProvider implements KycProvider {
  readonly name = "rekognition";

  private ensureConfigured(): void {
    if (!hasAwsKeys()) {
      if (process.env.KYC_REKOGNITION_FALLBACK_MOCK === "1") {
        return;
      }
      throw new Error("rekognition-not-configured");
    }
  }

  private async maybeMock(): Promise<KycProvider | null> {
    if (!hasAwsKeys() && process.env.KYC_REKOGNITION_FALLBACK_MOCK === "1") {
      return new MockKycProvider();
    }
    return null;
  }

  async verifyIdentity(input: {
    userId: string;
    expectedName?: string;
    callbackUrl?: string;
  }): Promise<KycProviderResult & { url?: string }> {
    const mock = await this.maybeMock();
    if (mock) {
      const r = await mock.verifyIdentity(input);
      return { ...r, provider: "rekognition", raw: { ...(r.raw ?? {}), fallback: "mock" } };
    }
    this.ensureConfigured();
    return {
      ...pendingResult(
        "AWS Rekognition CompareFaces/DetectFaces ainda não integrado — configure DIDIT ou mock para produção de KYC",
      ),
      url: input.callbackUrl,
    };
  }

  async faceMatch(input: {
    selfieMetaId?: string;
    documentMetaId?: string;
    scores?: { face?: number };
  }): Promise<KycProviderResult> {
    const mock = await this.maybeMock();
    if (mock) {
      const r = await mock.faceMatch(input);
      return { ...r, provider: "rekognition", raw: { ...(r.raw ?? {}), fallback: "mock" } };
    }
    this.ensureConfigured();
    return pendingResult(
      "Rekognition face match stub — sem envio de bytes neste adapter; use metadados e revisão humana (Botão Fênix)",
    );
  }

  async liveness(input: {
    mode: KycLivenessMode;
    challenge?: string;
  }): Promise<KycProviderResult> {
    const mock = await this.maybeMock();
    if (mock) {
      const r = await mock.liveness(input);
      return { ...r, provider: "rekognition", raw: { ...(r.raw ?? {}), fallback: "mock" } };
    }
    this.ensureConfigured();
    return pendingResult(
      `Rekognition liveness stub (mode=${input.mode}) — Face Liveness API não ligada nesta onda`,
    );
  }
}
