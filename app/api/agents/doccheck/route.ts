import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";
import { runDocCheck, type DocCheckKind } from "@/lib/agents/doccheck";
import { extractText } from "@/lib/ocr/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 80_000;
const KINDS = new Set<DocCheckKind>(["rg", "cnh", "cpf", "comprovante", "cnpj"]);

function parseKind(v: unknown): DocCheckKind | undefined {
  if (typeof v === "string" && KINDS.has(v as DocCheckKind)) return v as DocCheckKind;
  return undefined;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const actor = session.user.email ?? session.user.name ?? "user";
  const contentType = req.headers.get("content-type") || "";

  try {
    // Multipart: optional file → OCR then doccheck
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      let text = String(form.get("text") ?? "").slice(0, MAX_TEXT);
      const fileName =
        typeof form.get("fileName") === "string"
          ? String(form.get("fileName"))
          : undefined;
      const kind = parseKind(form.get("kind"));
      const cadastroNome = form.get("cadastroNome");
      const cadastroCpf = form.get("cadastroCpf");
      const cadastroDn = form.get("cadastroDataNascimento");
      const file = form.get("file");
      let ocrNote: string | undefined;
      let resolvedName = fileName;

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        resolvedName = resolvedName ?? f.name;
        if (f.type.startsWith("text/") || /\.(txt|csv|md)$/i.test(f.name)) {
          text = `${text}\n${await f.text()}`.trim().slice(0, MAX_TEXT);
        } else {
          const buf = Buffer.from(await f.arrayBuffer());
          const ocr = await extractText(buf, f.type || "application/octet-stream", f.name);
          text = `${text}\n${ocr.text}`.trim().slice(0, MAX_TEXT);
          ocrNote = ocr.note ?? `ocr:${ocr.provider}`;
        }
      }

      const result = runDocCheck({
        text,
        kind,
        fileName: resolvedName,
        cadastro:
          typeof cadastroNome === "string" && typeof cadastroCpf === "string"
            ? {
                nome: cadastroNome,
                cpf: cadastroCpf,
                dataNascimento:
                  typeof cadastroDn === "string" ? cadastroDn : undefined,
              }
            : undefined,
      });

      if (ocrNote) result.audit.notes.push(ocrNote);

      appendAudit({
        actor,
        agent: "doccheck",
        action: "checar",
        band: result.band,
        requiresLawyerReview: result.audit.requiresLawyerReview,
        payload: {
          kind,
          fileName: resolvedName,
          fraudScore: result.fraudScore,
          confidence: result.confidence,
        },
      });

      return NextResponse.json(result);
    }

    // JSON body
    const body = await req.json();
    let text = String(body?.text ?? "").slice(0, MAX_TEXT);
    const kind = parseKind(body?.kind);
    const fileName = typeof body?.fileName === "string" ? body.fileName : undefined;

    // Optional base64 image for OCR
    if (body?.imageBase64 && typeof body.imageBase64 === "string") {
      const mime = typeof body.mime === "string" ? body.mime : "image/jpeg";
      const raw = body.imageBase64.replace(/^data:[^;]+;base64,/, "");
      const buf = Buffer.from(raw, "base64");
      const ocr = await extractText(buf, mime, fileName);
      text = `${text}\n${ocr.text}`.trim().slice(0, MAX_TEXT);
      const result = runDocCheck({
        text,
        kind,
        fileName,
        cadastro: body?.cadastro,
      });
      result.audit.notes.push(ocr.note ?? `ocr:${ocr.provider}`);
      appendAudit({
        actor,
        agent: "doccheck",
        action: "checar",
        band: result.band,
        requiresLawyerReview: result.audit.requiresLawyerReview,
        payload: { kind, fileName, fraudScore: result.fraudScore, via: "imageBase64" },
      });
      return NextResponse.json(result);
    }

    const cadastro =
      body?.cadastro && typeof body.cadastro === "object"
        ? {
            nome: String(body.cadastro.nome ?? ""),
            cpf: String(body.cadastro.cpf ?? ""),
            dataNascimento:
              typeof body.cadastro.dataNascimento === "string"
                ? body.cadastro.dataNascimento
                : undefined,
          }
        : undefined;

    const result = runDocCheck({ text, kind, fileName, cadastro });

    appendAudit({
      actor,
      agent: "doccheck",
      action: "checar",
      band: result.band,
      requiresLawyerReview: result.audit.requiresLawyerReview,
      payload: {
        kind: kind ?? "auto",
        fraudScore: result.fraudScore,
        confidence: result.confidence,
        divergences: result.crossCheck.divergences.length,
      },
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
}
