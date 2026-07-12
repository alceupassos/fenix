import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  checkVaultDocumentConsent,
  isVaultDocKind,
  setVaultConsentChecker,
  storeVaultFile,
  toPublicVaultMeta,
} from "@/lib/vault";
import { hasRequiredConsents, DOCS_REQUIRED, KYC_REQUIRED } from "@/lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Wire LGPD consent store once per process.
setVaultConsentChecker(async (userId, purposes) => {
  const needed = purposes.includes("biometria") ? [...DOCS_REQUIRED, ...KYC_REQUIRED] : DOCS_REQUIRED;
  return hasRequiredConsents(userId, needed);
});

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

function clientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

function resolveUserId(session: {
  user?: { id?: string | null; email?: string | null };
}): string | null {
  if (session.user?.id) return session.user.id;
  if (session.user?.email) return session.user.email.toLowerCase();
  return null;
}

function truthyField(v: FormDataEntryValue | null): boolean {
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes";
}

/**
 * Cofre upload: multipart `file` + `kind` (rg|cnh|cpf|comprovante|selfie|outro).
 * Magic-byte validation, optional AES-256-GCM, audit trail.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "").toLowerCase().trim();

    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ error: "invalid-request" }, { status: 400 });
    }

    if (!isVaultDocKind(kindRaw)) {
      return NextResponse.json({ error: "invalid-request" }, { status: 400 });
    }

    const headerConsent = req.headers.get("x-consent-documentos") === "1";
    const formConsent =
      truthyField(form.get("consentDocumentos")) ||
      truthyField(form.get("consent_documentos")) ||
      truthyField(form.get("consent"));
    const bioHeader = req.headers.get("x-consent-biometria") === "1";
    const bioForm =
      truthyField(form.get("consentBiometria")) ||
      truthyField(form.get("consent_biometria"));

    const docConsented = await checkVaultDocumentConsent(userId, {
      headerConsent,
      formConsent,
    });

    // Selfie may rely on biometria consent alone; other docs need documentos consent.
    if (kindRaw === "selfie") {
      if (!docConsented && !bioHeader && !bioForm) {
        return NextResponse.json({ error: "consent-required" }, { status: 403 });
      }
    } else if (!docConsented) {
      return NextResponse.json({ error: "consent-required" }, { status: 403 });
    }

    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "file-too-large" }, { status: 413 });
    }

    const ab = await f.arrayBuffer();
    const buffer = Buffer.from(ab);

    const actor = session.user.email ?? userId;
    const { meta, encrypted, storage } = await storeVaultFile(
      userId,
      kindRaw,
      buffer,
      f.name || "upload",
      { actor, ip: clientIp(req) },
    );

    return NextResponse.json({
      ok: true,
      id: meta.id,
      kind: meta.kind,
      mime: meta.mime,
      size: meta.size,
      encrypted,
      storage,
      retentionUntil: meta.retentionUntil,
      retentionNote: meta.retentionNote,
      file: toPublicVaultMeta(meta),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "vault-mime-rejected") {
      return NextResponse.json({ error: "file-type-not-allowed" }, { status: 415 });
    }
    if (msg === "vault-empty" || msg === "vault-kind-invalid") {
      return NextResponse.json({ error: "invalid-request" }, { status: 400 });
    }
    if (msg === "s3-not-implemented") {
      return NextResponse.json({ error: "storage-unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  }
}
