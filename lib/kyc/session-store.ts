/**
 * In-memory KYC session store (LGPD: purge + exclusão on demand).
 * Scores/status only — never raw selfie/video.
 */

import { RETENTION_DAYS } from "@/lib/kyc-contracts";
import type { KycLivenessMode, KycProviderResult } from "@/lib/kyc-contracts";

export type KycSessionRecord = {
  sessionId: string;
  userId: string;
  provider: string;
  consentBiometria: boolean;
  consentAt: string;
  createdAt: string;
  expiresAt: string;
  status: KycProviderResult["status"] | "started";
  faceMatchScore: number | null;
  livenessScore: number | null;
  band: KycProviderResult["band"] | null;
  requiresLawyerReview: boolean;
  lastLivenessMode?: KycLivenessMode;
  providerUrl?: string;
  /** Opaque metadata only — no image bytes */
  meta?: Record<string, string | number | boolean | null>;
};

const sessions = new Map<string, KycSessionRecord>();

const MS_DAY = 24 * 60 * 60 * 1000;

function retentionMs(): number {
  return RETENTION_DAYS.kycSession * MS_DAY;
}

export function createKycSession(
  partial: Omit<KycSessionRecord, "createdAt" | "expiresAt" | "status"> & {
    status?: KycSessionRecord["status"];
  },
): KycSessionRecord {
  purgeExpired();
  const now = new Date();
  const rec: KycSessionRecord = {
    ...partial,
    status: partial.status ?? "started",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + retentionMs()).toISOString(),
  };
  sessions.set(rec.sessionId, rec);
  return rec;
}

export function getKycSession(sessionId: string): KycSessionRecord | undefined {
  purgeExpired();
  const rec = sessions.get(sessionId);
  if (!rec) return undefined;
  if (new Date(rec.expiresAt).getTime() <= Date.now()) {
    sessions.delete(sessionId);
    return undefined;
  }
  return rec;
}

export function getKycSessionsForUser(userId: string): KycSessionRecord[] {
  purgeExpired();
  return [...sessions.values()].filter((s) => s.userId === userId);
}

export function updateKycSession(
  sessionId: string,
  patch: Partial<Omit<KycSessionRecord, "sessionId" | "userId" | "createdAt">>,
): KycSessionRecord | undefined {
  const rec = getKycSession(sessionId);
  if (!rec) return undefined;
  const next = { ...rec, ...patch, sessionId: rec.sessionId, userId: rec.userId };
  sessions.set(sessionId, next);
  return next;
}

/** LGPD exclusão — remove biometric/session data for a session or all of a user. */
export function deleteKycSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function deleteKycSessionsForUser(userId: string): number {
  let n = 0;
  for (const [id, rec] of sessions) {
    if (rec.userId === userId) {
      sessions.delete(id);
      n++;
    }
  }
  return n;
}

export function purgeExpired(): number {
  const now = Date.now();
  let n = 0;
  for (const [id, rec] of sessions) {
    if (new Date(rec.expiresAt).getTime() <= now) {
      sessions.delete(id);
      n++;
    }
  }
  return n;
}

/** Test helper */
export function clearKycSessionsForTests(): void {
  sessions.clear();
}
