import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readVaultFile } from "@/lib/vault";

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

type Ctx = { params: Promise<{ id: string }> };

/** GET — download own file (decrypt if needed). Never serves other users' files. */
export async function GET(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  try {
    const result = await readVaultFile(id, {
      userId,
      actor: session.user.email ?? userId,
      ip: clientIp(req),
      action: "download",
    });

    if (!result) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }

    const filename = safeFilename(result.meta.originalName);
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.meta.mime,
        "Content-Length": String(result.buffer.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Vault-Encrypted": result.meta.encrypted ? "1" : "0",
      },
    });
  } catch {
    return NextResponse.json({ error: "download-failed" }, { status: 500 });
  }
}
