/**
 * Cofre (vault) — encrypted document store for KYC / recovery docs.
 * Bytes: StorageBackend (local `.data/vault` or S3 stub).
 * Meta + access log + share tokens: in-process Maps (DB tables exist for later).
 */

import { createHash, randomUUID } from "crypto";
import { appendAudit } from "@/lib/audit";
import {
  decryptBuffer,
  encryptBuffer,
  hasVaultKey,
} from "@/lib/crypto/vault-crypto";
import {
  RETENTION_DAYS,
  type VaultDocKind,
} from "@/lib/kyc-contracts";
import {
  detectMime,
  extensionForMime,
  isAllowedVaultMime,
  type DetectedMime,
} from "@/lib/vault/magic-bytes";
import {
  getStorageBackend,
  type StorageBackendName,
} from "@/lib/vault/storage";

export type VaultFileStatus = "uploaded" | "deleted";

export type VaultFileMeta = {
  id: string;
  userId: string;
  kind: VaultDocKind;
  mime: DetectedMime;
  /** Plaintext size in bytes (before encryption). */
  size: number;
  /** Relative storage key: `{userId}/{uuid}.{ext}` */
  storageKey: string;
  storage: StorageBackendName;
  encrypted: boolean;
  keyVersion?: string;
  /** Original client filename (in-memory only; never used as disk path). */
  originalName: string;
  originalNameHash: string;
  status: VaultFileStatus;
  retentionUntil: string;
  createdAt: string;
  deletedAt?: string;
  /** e.g. biometry short retention notice */
  retentionNote?: string;
};

export type VaultAccessEntry = {
  at: string;
  actor: string;
  action: string;
  ip?: string;
  meta?: Record<string, unknown>;
};

export type ShareTokenRecord = {
  token: string;
  fileId: string;
  userId: string;
  expiresAt: number;
  used: boolean;
  createdAt: string;
};

const VAULT_KINDS: ReadonlySet<string> = new Set([
  "rg",
  "cnh",
  "cpf",
  "comprovante",
  "selfie",
  "outro",
]);

export function isVaultDocKind(v: string): v is VaultDocKind {
  return VAULT_KINDS.has(v);
}

/** Optional consent hook — register from lib/consent when that module exists. */
export type VaultConsentChecker = (
  userId: string,
  purposes: string[],
) => boolean | Promise<boolean>;

let consentChecker: VaultConsentChecker | null = null;

export function setVaultConsentChecker(fn: VaultConsentChecker | null): void {
  consentChecker = fn;
}

export async function checkVaultDocumentConsent(
  userId: string,
  opts?: { headerConsent?: boolean; formConsent?: boolean },
): Promise<boolean> {
  if (opts?.headerConsent || opts?.formConsent) return true;
  if (consentChecker) {
    try {
      const purposes =
        /* biometry kinds need biometria too — caller may pass broader set later */
        ["documentos"];
      return Boolean(await consentChecker(userId, purposes));
    } catch {
      return false;
    }
  }
  return false;
}

// ── In-memory stores ────────────────────────────────────────────────────────

const metaById = new Map<string, VaultFileMeta>();
const idsByUser = new Map<string, Set<string>>();
const accessLog = new Map<string, VaultAccessEntry[]>();
const shareTokens = new Map<string, ShareTokenRecord>();

const MAX_ACCESS_PER_FILE = 500;

function hashName(name: string): string {
  return createHash("sha256").update(name, "utf8").digest("hex").slice(0, 32);
}

function retentionFor(kind: VaultDocKind): { until: Date; note?: string } {
  const days =
    kind === "selfie" ? RETENTION_DAYS.biometryArtifact : RETENTION_DAYS.vaultDocument;
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  if (kind === "selfie") {
    return {
      until,
      note: `Biometria/selfie: retenção curta (${RETENTION_DAYS.biometryArtifact} dias). Não é arquivo permanente.`,
    };
  }
  return { until };
}

function logAccess(
  fileId: string,
  entry: Omit<VaultAccessEntry, "at"> & { at?: string },
  audit?: { actor: string; action: string; userId: string; extra?: Record<string, unknown> },
): void {
  const row: VaultAccessEntry = {
    at: entry.at ?? new Date().toISOString(),
    actor: entry.actor,
    action: entry.action,
    ip: entry.ip,
    meta: entry.meta,
  };
  const list = accessLog.get(fileId) ?? [];
  list.push(row);
  if (list.length > MAX_ACCESS_PER_FILE) list.splice(0, list.length - MAX_ACCESS_PER_FILE);
  accessLog.set(fileId, list);

  if (audit) {
    appendAudit({
      actor: audit.actor,
      agent: "cofre",
      action: audit.action,
      entityType: "vault_file",
      entityId: fileId,
      payload: {
        userId: audit.userId,
        ...audit.extra,
      },
    });
  }
}

export function getVaultAccessLog(fileId: string): VaultAccessEntry[] {
  return [...(accessLog.get(fileId) ?? [])];
}

export type StoreVaultResult = {
  meta: VaultFileMeta;
  encrypted: boolean;
  storage: StorageBackendName;
};

/**
 * Validate magic bytes, encrypt if key present, write via storage backend.
 */
export async function storeVaultFile(
  userId: string,
  kind: VaultDocKind,
  buffer: Buffer,
  originalName: string,
  opts?: { actor?: string; ip?: string },
): Promise<StoreVaultResult> {
  if (!userId) throw new Error("vault-user-required");
  if (!isVaultDocKind(kind)) throw new Error("vault-kind-invalid");
  if (!buffer?.length) throw new Error("vault-empty");

  const mime = detectMime(buffer);
  if (!isAllowedVaultMime(mime)) {
    throw new Error("vault-mime-rejected");
  }

  const id = randomUUID();
  const ext = extensionForMime(mime);
  const storageKey = `${userId}/${id}.${ext}`;
  const backend = getStorageBackend();
  const actor = opts?.actor ?? userId;

  let toWrite: Buffer = buffer;
  let encrypted = false;
  let keyVersion: string | undefined;

  if (hasVaultKey()) {
    const blob = encryptBuffer(buffer);
    toWrite = Buffer.from(blob.ciphertextB64, "base64");
    encrypted = true;
    keyVersion = blob.keyVersion;
  }

  await backend.put(storageKey, toWrite);

  const { until, note } = retentionFor(kind);
  const meta: VaultFileMeta = {
    id,
    userId,
    kind,
    mime,
    size: buffer.length,
    storageKey,
    storage: backend.name,
    encrypted,
    keyVersion,
    originalName: originalName.slice(0, 255) || `${id}.${ext}`,
    originalNameHash: hashName(originalName || id),
    status: "uploaded",
    retentionUntil: until.toISOString(),
    createdAt: new Date().toISOString(),
    retentionNote: note,
  };

  metaById.set(id, meta);
  const set = idsByUser.get(userId) ?? new Set();
  set.add(id);
  idsByUser.set(userId, set);

  logAccess(
    id,
    {
      actor,
      action: "upload",
      ip: opts?.ip,
      meta: {
        kind,
        mime,
        size: buffer.length,
        encrypted,
        storage: backend.name,
      },
    },
    {
      actor,
      action: "upload",
      userId,
      extra: {
        kind,
        mime,
        size: buffer.length,
        encrypted,
        storage: backend.name,
        retentionUntil: meta.retentionUntil,
        retentionNote: note,
      },
    },
  );

  return { meta, encrypted, storage: backend.name };
}

export function listVaultFiles(userId: string): VaultFileMeta[] {
  const ids = idsByUser.get(userId);
  if (!ids) return [];
  const out: VaultFileMeta[] = [];
  for (const id of ids) {
    const m = metaById.get(id);
    if (m && m.status !== "deleted" && !m.deletedAt) out.push(m);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getVaultMeta(fileId: string): VaultFileMeta | null {
  return metaById.get(fileId) ?? null;
}

export function getOwnedVaultMeta(userId: string, fileId: string): VaultFileMeta | null {
  const m = metaById.get(fileId);
  if (!m || m.userId !== userId) return null;
  if (m.status === "deleted" || m.deletedAt) return null;
  return m;
}

export type ReadVaultResult = {
  meta: VaultFileMeta;
  buffer: Buffer;
};

/** Load and decrypt (if needed) for owner or share path. */
export async function readVaultFile(
  fileId: string,
  opts: { userId?: string; actor: string; ip?: string; action?: string; skipOwnerCheck?: boolean },
): Promise<ReadVaultResult | null> {
  const meta = metaById.get(fileId);
  if (!meta || meta.status === "deleted" || meta.deletedAt) return null;
  if (!opts.skipOwnerCheck) {
    if (!opts.userId || meta.userId !== opts.userId) return null;
  }

  const backend = getStorageBackend();
  // Prefer meta.storage; if backends differ (e.g. tests), still use current backend
  // with the stored key under the same process.
  void meta.storage;
  const stored = await backend.get(meta.storageKey);
  if (!stored) return null;

  let buffer: Buffer;
  if (meta.encrypted) {
    buffer = decryptBuffer(stored.toString("base64"));
  } else {
    buffer = stored;
  }

  logAccess(
    fileId,
    {
      actor: opts.actor,
      action: opts.action ?? "download",
      ip: opts.ip,
    },
    {
      actor: opts.actor,
      action: opts.action ?? "download",
      userId: meta.userId,
      extra: { encrypted: meta.encrypted },
    },
  );

  return { meta, buffer };
}

/**
 * Soft-delete meta, purge bytes from storage.
 */
export async function deleteVaultFile(
  userId: string,
  fileId: string,
  opts?: { actor?: string; ip?: string },
): Promise<boolean> {
  const meta = metaById.get(fileId);
  if (!meta || meta.userId !== userId) return false;
  if (meta.status === "deleted" || meta.deletedAt) return true;

  const backend = getStorageBackend();
  try {
    await backend.delete(meta.storageKey);
  } catch {
    /* still mark deleted */
  }

  meta.status = "deleted";
  meta.deletedAt = new Date().toISOString();
  metaById.set(fileId, meta);

  const actor = opts?.actor ?? userId;
  logAccess(
    fileId,
    { actor, action: "delete", ip: opts?.ip },
    {
      actor,
      action: "delete",
      userId,
      extra: { purged: true },
    },
  );

  return true;
}

export function createExpiringShareToken(
  userId: string,
  fileId: string,
  ttlMinutes: number,
): ShareTokenRecord | null {
  const meta = getOwnedVaultMeta(userId, fileId);
  if (!meta) return null;

  const ttl = Math.min(Math.max(1, Math.floor(ttlMinutes)), 60 * 24 * 7); // 1 min … 7 days
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const rec: ShareTokenRecord = {
    token,
    fileId,
    userId,
    expiresAt: Date.now() + ttl * 60 * 1000,
    used: false,
    createdAt: new Date().toISOString(),
  };
  shareTokens.set(token, rec);

  logAccess(
    fileId,
    {
      actor: userId,
      action: "share_create",
      meta: { ttlMinutes: ttl, expiresAt: new Date(rec.expiresAt).toISOString() },
    },
    {
      actor: userId,
      action: "share_create",
      userId,
      extra: { ttlMinutes: ttl },
    },
  );

  return rec;
}

export function resolveShareToken(token: string): ShareTokenRecord | null {
  const rec = shareTokens.get(token);
  if (!rec) return null;
  if (rec.used) return null;
  if (Date.now() > rec.expiresAt) {
    shareTokens.delete(token);
    return null;
  }
  return rec;
}

/** Mark share token consumed (one-time download). */
export function consumeShareToken(token: string): void {
  const rec = shareTokens.get(token);
  if (!rec) return;
  rec.used = true;
  shareTokens.set(token, rec);
}

/** Public list shape (no storage paths). */
export function toPublicVaultMeta(m: VaultFileMeta) {
  return {
    id: m.id,
    kind: m.kind,
    mime: m.mime,
    size: m.size,
    encrypted: m.encrypted,
    storage: m.storage,
    originalName: m.originalName,
    status: m.status,
    retentionUntil: m.retentionUntil,
    retentionNote: m.retentionNote,
    createdAt: m.createdAt,
  };
}

/** Test helpers */
export function clearVaultForTests(): void {
  metaById.clear();
  idsByUser.clear();
  accessLog.clear();
  shareTokens.clear();
}
