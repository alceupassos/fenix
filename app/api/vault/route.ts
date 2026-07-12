import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteVaultFile,
  listVaultFiles,
  toPublicVaultMeta,
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

/** GET — list own vault files (session). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const files = listVaultFiles(userId).map(toPublicVaultMeta);
  return NextResponse.json({ ok: true, files });
}

/** DELETE ?id= — soft delete + purge bytes (own files only). */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const actor = session.user.email ?? userId;
  const ok = await deleteVaultFile(userId, id, { actor, ip: clientIp(req) });
  if (!ok) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id, deleted: true });
}
