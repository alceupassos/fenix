import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";
import {
  buildRegistrationOptions,
  verifyRegistrationStub,
} from "@/lib/kyc/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — { action: "options" | "verify", ... }
 * Stub WebAuthn registration options + verify (no full attestation parse).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    challenge?: string;
    credentialId?: string;
    rpId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const userId = session.user.id ?? session.user.email ?? "unknown";
  const userName = session.user.email ?? userId;
  const action = body.action ?? "options";

  if (action === "options") {
    const options = buildRegistrationOptions({
      userId,
      userName,
      displayName: session.user.name ?? userName,
      rpId: body.rpId,
      rpName: "Sociedade Fênix",
    });

    appendAudit({
      actor: session.user.email ?? userId,
      agent: "kyc",
      action: "webauthn_options",
      entityType: "webauthn",
      entityId: userId,
      band: "amarela",
      payload: { rp: options.rp.name },
    });

    return NextResponse.json({
      ok: true,
      action: "options",
      options,
      note: "Challenge mock server-side — produção deve usar @simplewebauthn/server.",
    });
  }

  if (action === "verify") {
    const result = verifyRegistrationStub({
      userId,
      challenge: body.challenge,
      credentialId: body.credentialId,
    });

    appendAudit({
      actor: session.user.email ?? userId,
      agent: "kyc",
      action: "webauthn_verify",
      entityType: "webauthn",
      entityId: userId,
      band: "amarela",
      payload: {
        ok: result.ok,
        reason: result.reason ?? null,
        // never log attestation blobs
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason ?? "verify-failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      action: "verify",
      status: "pass",
      band: "amarela",
      requiresLawyerReview: true,
      note: "Passkey registrada (stub). Não substitui revisão jurídica (Botão Fênix).",
    });
  }

  return NextResponse.json(
    { error: "invalid-action", allowed: ["options", "verify"] },
    { status: 400 },
  );
}
