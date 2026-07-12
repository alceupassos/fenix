import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  consumeShareToken,
  createExpiringShareToken,
  readVaultFile,
  resolveShareToken,
} from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveUserId(session: {
  user?: { id?: string | null; email?: string | null };
}): string | null {
  if (session.user?.id) return session.user.id;
  if (session.user?.email) return session.user.email.toLowerCase();
  return null;
}

function clientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

function safeFilename(name: string): string {
  return name.replace(/[^\w.\-()\s\u00C0-\u024F]/g, "_").slice(0, 180) || "document";
}

/**
 * POST { fileId, ttlMinutes } — create expiring one-time share token (auth).
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

  let body: { fileId?: string; ttlMinutes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const fileId = typeof body.fileId === "string" ? body.fileId.trim() : "";
  const ttlMinutes =
    typeof body.ttlMinutes === "number" && Number.isFinite(body.ttlMinutes)
      ? body.ttlMinutes
      : 60;

  if (!fileId) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const rec = createExpiringShareToken(userId, fileId, ttlMinutes);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    token: rec.token,
    fileId: rec.fileId,
    expiresAt: new Date(rec.expiresAt).toISOString(),
    once: true,
  });
}

/**
 * GET ?token= — download once until expiry (no session required for the token holder).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const rec = resolveShareToken(token);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  try {
    const result = await readVaultFile(rec.fileId, {
      userId: rec.userId,
      actor: `share:${token.slice(0, 8)}`,
      ip: clientIp(req),
      action: "share_download",
      skipOwnerCheck: false,
    });

    if (!result || result.meta.userId !== rec.userId) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }

    consumeShareToken(token);

    const filename = safeFilename(result.meta.originalName);
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.meta.mime,
        "Content-Length": String(result.buffer.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "download-failed" }, { status: 500 });
  }
}
