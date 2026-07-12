/**
 * KYC provider factory — KYC_PROVIDER=mock|didit|rekognition
 */

import type { KycLivenessMode, KycProviderResult } from "@/lib/kyc-contracts";
import { DiditKycProvider } from "./didit";
import { MockKycProvider } from "./mock";
import { RekognitionKycProvider } from "./rekognition";

export interface KycProvider {
  name: string;
  verifyIdentity(input: {
    userId: string;
    expectedName?: string;
    callbackUrl?: string;
  }): Promise<KycProviderResult & { url?: string }>;
  faceMatch(input: {
    selfieMetaId?: string;
    documentMetaId?: string;
    scores?: { face?: number };
  }): Promise<KycProviderResult>;
  liveness(input: {
    mode: KycLivenessMode;
    challenge?: string;
  }): Promise<KycProviderResult>;
}

export type KycProviderName = "mock" | "didit" | "rekognition";

export function resolveKycProviderName(): KycProviderName {
  const raw = (process.env.KYC_PROVIDER ?? "mock").trim().toLowerCase();
  if (raw === "didit" || raw === "rekognition" || raw === "mock") return raw;
  return "mock";
}

export function getKycProvider(): KycProvider {
  const name = resolveKycProviderName();

  if (name === "didit") {
    if (!process.env.DIDIT_API_KEY?.trim()) {
      // Graceful fallback so local/dev never hard-fails
      return new MockKycProvider();
    }
    return new DiditKycProvider();
  }

  if (name === "rekognition") {
    return new RekognitionKycProvider();
  }

  return new MockKycProvider();
}
