import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";
import { runIris } from "@/lib/agents/iris";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

/**
 * Vault upload stub: accepts text/PDF text-layer files, runs Íris, returns extraction.
 * Binary storage (S3) is deferred; we keep an audit event as access trail.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const note = String(form.get("note") ?? "");

    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ error: "file-required" }, { status: 400 });
    }

    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "file-too-large", maxBytes: MAX_BYTES }, { status: 413 });
    }

    let text = note;
    if (f.type.startsWith("text/") || /\.(txt|csv|md)$/i.test(f.name)) {
      text = `${note}\n${await f.text()}`;
    } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      // Delegate full pipeline to iris multipart by reusing JSON path with weak extract note
      text = note || `[arquivo PDF: ${f.name} — use /api/agents/iris multipart para extração]`;
    }

    const iris = runIris({ text: text.slice(0, 80_000), fileName: f.name });

    const event = appendAudit({
      actor: session.user.email ?? session.user.name ?? "user",
      agent: "cofre",
      action: "upload",
      entityType: "document",
      entityId: f.name,
      band: iris.band,
      payload: {
        size: f.size,
        type: f.type,
        kind: iris.extracted.kind,
      },
    });

    return NextResponse.json({
      ok: true,
      fileName: f.name,
      size: f.size,
      auditId: event.id,
      iris,
      storage: "ephemeral-audit-only",
      message:
        "Arquivo processado pela Íris. Persistência criptografada em S3 entra na onda de infraestrutura; trilha de acesso já registrada.",
    });
  } catch {
    return NextResponse.json({ error: "upload-failed" }, { status: 500 });
  }
}
