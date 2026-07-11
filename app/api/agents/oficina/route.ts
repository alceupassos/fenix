import { NextResponse } from "next/server";
import { runOficina, type OficinaInput } from "@/lib/agents/oficina";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<OficinaInput> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const kind = body.kind ?? "contestacao_cobranca";
  const result = runOficina({
    kind,
    nomeUsuario: body.nomeUsuario ?? "",
    fatos: body.fatos ?? "",
    valorCausa: body.valorCausa,
    numeroProcesso: body.numeroProcesso,
    comarca: body.comarca,
    documentos: body.documentos,
  });

  appendAudit({
    actor: "sistema",
    agent: "oficina",
    action: "preparar_minuta",
    band: result.band,
    requiresLawyerReview: true,
    payload: { kind, faltantes: result.camposFaltantes.length },
  });

  return NextResponse.json(result);
}
