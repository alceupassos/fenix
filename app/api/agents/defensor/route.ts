import { NextResponse } from "next/server";
import { runDefensor } from "@/lib/agents/defensor";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    empresa?: string;
    problema?: string;
    jaFez?: Array<"sac" | "ouvidoria" | "consumidor_gov" | "procon" | "regulador">;
    valorEnvolvido?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const result = runDefensor({
    empresa: body.empresa ?? "",
    problema: body.problema ?? "",
    jaFez: body.jaFez,
    valorEnvolvido: body.valorEnvolvido,
  });

  appendAudit({
    actor: "sistema",
    agent: "defensor",
    action: "escada",
    band: result.band,
    payload: { proximo: result.proximoDegrau },
  });

  return NextResponse.json(result);
}
