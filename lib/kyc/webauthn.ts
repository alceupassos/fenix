/**
 * WebAuthn / passkey helpers for KYC step-up.
 * Client-safe availability check + simple server challenge store (mock registration options).
 */

/** In-memory challenge store (server only). */
const challenges = new Map<string, { challenge: string; userId: string; expiresAt: number }>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function purgeChallenges(): void {
  const now = Date.now();
  for (const [k, v] of challenges) {
    if (v.expiresAt <= now) challenges.delete(k);
  }
}

/** Base64url without padding. */
export function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // btoa available in browser
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomChallenge(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toBase64Url(bytes);
}

/**
 * Client-safe: true when PublicKeyCredential exists (WebAuthn available).
 * Safe to call from browser; on server returns false unless polyfilled.
 */
export function isWebAuthnAvailable(): boolean {
  try {
    return (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as { PublicKeyCredential?: unknown }).PublicKeyCredential !== "undefined"
    );
  } catch {
    return false;
  }
}

export type RegistrationOptionsMock = {
  challenge: string;
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: "public-key"; alg: number }[];
  timeout: number;
  attestation: "none";
  authenticatorSelection: {
    residentKey: "preferred";
    userVerification: "preferred";
  };
};

/** Build mock PublicKeyCredentialCreationOptions-like payload (server-side). */
export function buildRegistrationOptions(input: {
  userId: string;
  userName: string;
  displayName?: string;
  rpId?: string;
  rpName?: string;
}): RegistrationOptionsMock {
  purgeChallenges();
  const challenge = randomChallenge(32);
  challenges.set(input.userId, {
    challenge,
    userId: input.userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  return {
    challenge,
    rp: {
      name: input.rpName ?? "Sociedade Fênix",
      id: input.rpId,
    },
    user: {
      id: toBase64Url(new TextEncoder().encode(input.userId)),
      name: input.userName,
      displayName: input.displayName ?? input.userName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    timeout: 60_000,
    attestation: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  };
}

export function getStoredChallenge(userId: string): string | undefined {
  purgeChallenges();
  const rec = challenges.get(userId);
  if (!rec) return undefined;
  if (rec.expiresAt <= Date.now()) {
    challenges.delete(userId);
    return undefined;
  }
  return rec.challenge;
}

/** Stub verify: accepts if challenge matches stored value (no crypto attestation parse). */
export function verifyRegistrationStub(input: {
  userId: string;
  challenge?: string;
  credentialId?: string;
}): { ok: boolean; reason?: string } {
  const expected = getStoredChallenge(input.userId);
  if (!expected) return { ok: false, reason: "challenge-expired" };
  if (input.challenge && input.challenge !== expected) {
    return { ok: false, reason: "challenge-mismatch" };
  }
  challenges.delete(input.userId);
  if (!input.credentialId) return { ok: false, reason: "credential-missing" };
  return { ok: true };
}

export function clearWebAuthnChallengesForTests(): void {
  challenges.clear();
}
