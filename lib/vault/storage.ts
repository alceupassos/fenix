/**
 * Vault binary storage backends.
 * Local (default): `.data/vault/{userId}/{uuid}.{ext}` (gitignored).
 * S3: only selected when all S3_* env vars are set; without @aws-sdk it throws
 * not-implemented so callers know to install/configure a real adapter later.
 */

import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export type StorageBackendName = "local" | "s3";

export interface StorageBackend {
  readonly name: StorageBackendName;
  /** Relative key, e.g. `{userId}/{uuid}.pdf` */
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const LOCAL_ROOT = path.join(process.cwd(), ".data", "vault");

function assertSafeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("vault-key-invalid");
  }
  return normalized;
}

export class LocalStorageBackend implements StorageBackend {
  readonly name = "local" as const;

  private resolve(key: string): string {
    const safe = assertSafeKey(key);
    const full = path.resolve(LOCAL_ROOT, safe);
    if (!full.startsWith(path.resolve(LOCAL_ROOT))) {
      throw new Error("vault-key-invalid");
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") return;
      throw err;
    }
  }
}

/**
 * Placeholder S3 backend — selected only when fully configured.
 * Real SigV4 / @aws-sdk wiring is deferred (SDK not in package.json).
 */
export class S3StorageBackend implements StorageBackend {
  readonly name = "s3" as const;

  constructor(
    readonly config: {
      endpoint: string;
      bucket: string;
      accessKey: string;
      secretKey: string;
      region: string;
    },
  ) {}

  async put(_key: string, _data: Buffer): Promise<void> {
    throw new Error("s3-not-implemented");
  }

  async get(_key: string): Promise<Buffer | null> {
    throw new Error("s3-not-implemented");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("s3-not-implemented");
  }
}

export type S3Env = {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region: string;
};

export function readS3Env(): S3Env | null {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKey = process.env.S3_ACCESS_KEY?.trim();
  const secretKey = process.env.S3_SECRET_KEY?.trim();
  const region = process.env.S3_REGION?.trim();
  if (!endpoint || !bucket || !accessKey || !secretKey || !region) return null;
  return { endpoint, bucket, accessKey, secretKey, region };
}

let cached: StorageBackend | null = null;

/** S3 when all S3_* are set; otherwise local filesystem under `.data/vault`. */
export function getStorageBackend(): StorageBackend {
  if (cached) return cached;
  const s3 = readS3Env();
  if (s3) {
    cached = new S3StorageBackend(s3);
  } else {
    cached = new LocalStorageBackend();
  }
  return cached;
}

/** Test helper — reset singleton. */
export function resetStorageBackendForTests(): void {
  cached = null;
}
