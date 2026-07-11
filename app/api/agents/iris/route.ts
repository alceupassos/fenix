import { NextResponse } from "next/server";
import { runIris } from "@/lib/agents/iris";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 80_000;

/** Best-effort extract of readable strings from PDF bytes (no full OCR). */
function extractPdfStrings(buf: ArrayBuffer): string {
  const raw = Buffer.from(buf).toString("latin1");
  const chunks: string[] = [];
  // PDF text operators often wrap strings in (...)
  const re = /\((?:\\.|[^\\)]){3,}\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const inner = m[0]
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    if (/[A-Za-zÀ-ú0-9]{3,}/.test(inner)) chunks.push(inner);
  }
  // Also pull sequences of printable UTF-ish runs
  const runs = raw.match(/[\x20-\x7EÀ-ú]{6,}/g) ?? [];
  for (const r of runs) {
    if (/[A-Za-zÀ-ú]{4,}/.test(r) && !r.startsWith("endobj")) chunks.push(r);
  }
  return [...new Set(chunks)].join("\n").slice(0, MAX_TEXT);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const textField = String(form.get("text") ?? "");
      const file = form.get("file");
      let fileName: string | undefined;
      let fileText = "";
      let ocrNote: string | undefined;

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const f = file as File;
        fileName = f.name;
        if (f.type.startsWith("text/") || /\.(txt|csv|md)$/i.test(f.name)) {
          fileText = await f.text();
        } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
          const buf = await f.arrayBuffer();
          fileText = extractPdfStrings(buf);
          if (fileText.length < 40) {
            return NextResponse.json(
              {
                error: "pdf-text-weak",
                message:
                  "Não extraímos texto útil deste PDF (pode ser escaneado). Cole o texto ou use um PDF com camada de texto. OCR de imagem chega com motor dedicado.",
              },
              { status: 422 },
            );
          }
          ocrNote = "extração heurística de strings do PDF (não é OCR de imagem)";
        } else if (f.type.startsWith("image/")) {
          return NextResponse.json(
            {
              error: "image-ocr-pending",
              message:
                "OCR de imagem ainda não está ativo. Digite ou cole o que está escrito no papel, ou envie .txt/.pdf com texto.",
            },
            { status: 422 },
          );
        }
      }

      const text = `${textField}\n${fileText}`.trim().slice(0, MAX_TEXT);
      const result = runIris({ text, fileName });
      if (ocrNote) {
        result.audit.notes.push(ocrNote);
      }
      appendAudit({
        actor: "sistema",
        agent: "iris",
        action: "extrair",
        band: result.band,
        payload: { kind: result.extracted.kind, fileName },
      });
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "bad-multipart" }, { status: 400 });
    }
  }

  try {
    const body = await req.json();
    const text = String(body?.text ?? "").slice(0, MAX_TEXT);
    const fileName = typeof body?.fileName === "string" ? body.fileName : undefined;
    const result = runIris({ text, fileName });
    appendAudit({
      actor: "sistema",
      agent: "iris",
      action: "extrair",
      band: result.band,
      payload: { kind: result.extracted.kind },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
}
