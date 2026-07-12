/**
 * LGPD consent store — in-memory + optional Postgres when FENIX_DATABASE_URL is set.
 * Purposes and term version come from kyc-contracts.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  CONSENT_TERM_VERSION,
  type ConsentPurpose,
} from "@/lib/kyc-contracts";

export type ConsentRecord = {
  id: number;
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  termVersion: string;
  ip?: string | null;
  userAgent?: string | null;
  grantedAt: Date;
  revokedAt?: Date | null;
};

export type RecordConsentInput = {
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  termVersion?: string;
  ip?: string | null;
  userAgent?: string | null;
};

const ALL_PURPOSES: ConsentPurpose[] = [
  "termos_uso",
  "privacidade",
  "documentos",
  "biometria",
  "comunicacao",
  "marketing",
];

/** Required at signup. */
export const SIGNUP_REQUIRED: ConsentPurpose[] = ["termos_uso", "privacidade"];

/** Required before document vault upload. */
export const DOCS_REQUIRED: ConsentPurpose[] = ["documentos"];

/** Required before KYC / biometry. */
export const KYC_REQUIRED: ConsentPurpose[] = ["biometria"];

let nextId = 1;
/** Latest consent rows by `${userId}:${purpose}` (in-memory). */
const memoryConsents = new Map<string, ConsentRecord>();
/** Full history for listConsents (in-memory). */
const memoryHistory: ConsentRecord[] = [];

function memKey(userId: string, purpose: ConsentPurpose): string {
  return `${userId}:${purpose}`;
}

function isPurpose(v: unknown): v is ConsentPurpose {
  return typeof v === "string" && (ALL_PURPOSES as string[]).includes(v);
}

export function isConsentPurpose(v: unknown): v is ConsentPurpose {
  return isPurpose(v);
}

export function listConsentPurposes(): ConsentPurpose[] {
  return [...ALL_PURPOSES];
}

/**
 * Record grant or revoke. When granted=false, marks as revoked.
 * Writes to DB when available; always keeps in-memory mirror.
 */
export async function recordConsent(input: RecordConsentInput): Promise<ConsentRecord> {
  const purpose = input.purpose;
  if (!isPurpose(purpose)) {
    throw new Error("consent-purpose-invalid");
  }
  const termVersion = input.termVersion ?? CONSENT_TERM_VERSION;
  const now = new Date();
  const granted = Boolean(input.granted);

  let record: ConsentRecord = {
    id: nextId++,
    userId: input.userId,
    purpose,
    granted,
    termVersion,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    grantedAt: now,
    revokedAt: granted ? null : now,
  };

  if (db) {
    try {
      if (granted) {
        const rows = await db
          .insert(schema.consents)
          .values({
            userId: input.userId,
            purpose,
            granted: true,
            termVersion,
            ip: input.ip ?? null,
            userAgent: input.userAgent ?? null,
            grantedAt: now,
            revokedAt: null,
          })
          .returning();
        const row = rows[0];
        if (row) {
          record = {
            id: row.id,
            userId: row.userId,
            purpose: row.purpose as ConsentPurpose,
            granted: row.granted,
            termVersion: row.termVersion,
            ip: row.ip,
            userAgent: row.userAgent,
            grantedAt: row.grantedAt,
            revokedAt: row.revokedAt,
          };
        }
      } else {
        // Soft-revoke latest active grant for this purpose
        const existing = await db
          .select()
          .from(schema.consents)
          .where(
            and(
              eq(schema.consents.userId, input.userId),
              eq(schema.consents.purpose, purpose),
              eq(schema.consents.granted, true),
              isNull(schema.consents.revokedAt),
            ),
          )
          .orderBy(desc(schema.consents.grantedAt))
          .limit(1);
        if (existing[0]) {
          const rows = await db
            .update(schema.consents)
            .set({ granted: false, revokedAt: now })
            .where(eq(schema.consents.id, existing[0].id))
            .returning();
          const row = rows[0];
          if (row) {
            record = {
              id: row.id,
              userId: row.userId,
              purpose: row.purpose as ConsentPurpose,
              granted: row.granted,
              termVersion: row.termVersion,
              ip: row.ip,
              userAgent: row.userAgent,
              grantedAt: row.grantedAt,
              revokedAt: row.revokedAt,
            };
          }
        } else {
          const rows = await db
            .insert(schema.consents)
            .values({
              userId: input.userId,
              purpose,
              granted: false,
              termVersion,
              ip: input.ip ?? null,
              userAgent: input.userAgent ?? null,
              grantedAt: now,
              revokedAt: now,
            })
            .returning();
          const row = rows[0];
          if (row) {
            record = {
              id: row.id,
              userId: row.userId,
              purpose: row.purpose as ConsentPurpose,
              granted: row.granted,
              termVersion: row.termVersion,
              ip: row.ip,
              userAgent: row.userAgent,
              grantedAt: row.grantedAt,
              revokedAt: row.revokedAt,
            };
          }
        }
      }
    } catch {
      // DB unavailable — keep memory path
    }
  }

  memoryConsents.set(memKey(input.userId, purpose), record);
  memoryHistory.push(record);
  return record;
}

/** List consent records for a user (latest-first per purpose when DB; full history in memory). */
export async function listConsents(userId: string): Promise<ConsentRecord[]> {
  if (db) {
    try {
      const rows = await db
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.userId, userId))
        .orderBy(desc(schema.consents.grantedAt));
      if (rows.length) {
        return rows.map((row) => ({
          id: row.id,
          userId: row.userId,
          purpose: row.purpose as ConsentPurpose,
          granted: row.granted,
          termVersion: row.termVersion,
          ip: row.ip,
          userAgent: row.userAgent,
          grantedAt: row.grantedAt,
          revokedAt: row.revokedAt,
        }));
      }
    } catch {
      /* fall through */
    }
  }
  return memoryHistory
    .filter((c) => c.userId === userId)
    .slice()
    .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
}

/**
 * True when every purpose in `required` has an active grant at CONSENT_TERM_VERSION
 * (or any version if termVersion check is skipped — we always check current version).
 */
export async function hasRequiredConsents(
  userId: string,
  required: ConsentPurpose[],
  termVersion: string = CONSENT_TERM_VERSION,
): Promise<boolean> {
  if (!required.length) return true;

  const latest = new Map<ConsentPurpose, ConsentRecord>();

  if (db) {
    try {
      const rows = await db
        .select()
        .from(schema.consents)
        .where(eq(schema.consents.userId, userId))
        .orderBy(desc(schema.consents.grantedAt));
      for (const row of rows) {
        const p = row.purpose as ConsentPurpose;
        if (!latest.has(p)) {
          latest.set(p, {
            id: row.id,
            userId: row.userId,
            purpose: p,
            granted: row.granted,
            termVersion: row.termVersion,
            ip: row.ip,
            userAgent: row.userAgent,
            grantedAt: row.grantedAt,
            revokedAt: row.revokedAt,
          });
        }
      }
    } catch {
      /* memory fallback below */
    }
  }

  if (!latest.size) {
    for (const purpose of required) {
      const rec = memoryConsents.get(memKey(userId, purpose));
      if (rec) latest.set(purpose, rec);
    }
  }

  return required.every((purpose) => {
    const rec = latest.get(purpose);
    if (!rec) return false;
    if (!rec.granted) return false;
    if (rec.revokedAt) return false;
    if (rec.termVersion !== termVersion) return false;
    return true;
  });
}

/** Revoke a purpose for the user (records granted=false). */
export async function revokeConsent(
  userId: string,
  purpose: ConsentPurpose,
  meta?: { ip?: string | null; userAgent?: string | null },
): Promise<ConsentRecord> {
  return recordConsent({
    userId,
    purpose,
    granted: false,
    termVersion: CONSENT_TERM_VERSION,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}
