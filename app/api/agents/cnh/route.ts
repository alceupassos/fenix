import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  runCnh,
  type CnhInput,
  type CnhServiceKind,
  type MultaRecursoEtapa,
} from "@/lib/agents/cnh";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVICES: CnhServiceKind[] = [
  "perda_roubo_extravio",
  "renovacao",
  "mudanca_categoria",
  "primeira_habilitacao",
  "cnh_digital",
  "consulta_pontos",
  "recurso_multa",
  "suspensao_cassacao",
  "crlv_licenciamento_ipva",
];

const ETAPAS: MultaRecursoEtapa[] = ["defesa_previa", "jari", "cetran"];

function isService(v: unknown): v is CnhServiceKind {
  return typeof v === "string" && (SERVICES as string[]).includes(v);
}

function isEtapa(v: unknown): v is MultaRecursoEtapa {
  return typeof v === "string" && (ETAPAS as string[]).includes(v);
}

export async function POST(req: Request) {
  const session = await auth();
  // Prefer authenticated user for audit; allow anonymous orientation (canais públicos).
  const actor = session?.user?.email ?? session?.user?.name ?? "anon";

  let body: Partial<CnhInput> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  if (!isService(body.service)) {
    return NextResponse.json(
      { error: "invalid-service", message: "Informe um serviço CNH válido.", services: SERVICES },
      { status: 400 },
    );
  }

  const multa = body.multa
    ? {
        autoInfracao: body.multa.autoInfracao,
        dataNotificacao: body.multa.dataNotificacao,
        etapa: isEtapa(body.multa.etapa) ? body.multa.etapa : undefined,
        orgao: body.multa.orgao,
      }
    : undefined;

  const input: CnhInput = {
    service: body.service,
    uf: body.uf,
    relato: body.relato,
    categoria: body.categoria,
    multa,
    pontos: typeof body.pontos === "number" ? body.pontos : undefined,
  };

  const result = runCnh(input);

  appendAudit({
    actor,
    agent: "cnh",
    action: "orientar_servico",
    band: result.band,
    requiresLawyerReview: result.audit.requiresLawyerReview,
    payload: {
      service: result.service,
      uf: input.uf ?? "SP",
      hasMinuta: Boolean(result.minutaSugerida),
    },
  });

  return NextResponse.json(result);
}
