/**
 * AES-256-GCM encryption for vault documents and biometric artifacts.
 * Key derived from KEY_VAULTS_SECRET (or AUTH_SECRET fallback in dev only).
 * Never log plaintext or raw keys.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function resolveSecret(): string | null {
  return process.env.KEY_VAULTS_SECRET || process.env.AUTH_SECRET || null;
}

/** 32-byte key from secret string (SHA-256). */
export function deriveVaultKey(secret?: string | null): Buffer | null {
  const s = secret ?? resolveSecret();
  if (!s) return null;
  return createHash("sha256").update(s, "utf8").digest();
}

export function hasVaultKey(): boolean {
  return Boolean(resolveSecret());
}

export type EncryptedBlob = {
  /** base64(iv + ciphertext + authTag) */
  ciphertextB64: string;
  alg: typeof ALGO;
  keyVersion: string;
};

/**
 * Encrypt buffer. Throws if no KEY_VAULTS_SECRET/AUTH_SECRET.
 * Format: IV(12) || ciphertext || tag(16) as base64.
 */
export function encryptBuffer(plain: Buffer, secret?: string | null): EncryptedBlob {
  const key = deriveVaultKey(secret);
  if (!key) throw new Error("vault-key-missing");
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, enc, tag]);
  return {
    ciphertextB64: packed.toString("base64"),
    alg: ALGO,
    keyVersion: "kv1",
  };
}

export function decryptBuffer(blob: EncryptedBlob | string, secret?: string | null): Buffer {
  const key = deriveVaultKey(secret);
  if (!key) throw new Error("vault-key-missing");
  const b64 = typeof blob === "string" ? blob : blob.ciphertextB64;
  const packed = Buffer.from(b64, "base64");
  if (packed.length < IV_LEN + TAG_LEN + 1) throw new Error("vault-payload-invalid");
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(packed.length - TAG_LEN);
  const data = packed.subarray(IV_LEN, packed.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/** Mask CPF for logs: 123.***.***-45 */
export function maskCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return "***";
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

/** Mask email partially. */
export function maskEmail(email: string): string {
  const [u, domain] = email.split("@");
  if (!domain) return "***";
  const visible = u.slice(0, 2);
  return `${visible}***@${domain}`;
}
