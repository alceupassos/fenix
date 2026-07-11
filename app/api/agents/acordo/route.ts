import { NextResponse } from "next/server";
import { runAcordo } from "@/lib/agents/acordo";
import { debtsFromDashboard, runAtlas } from "@/lib/agents/atlas";
import { getDashboard } from "@/lib/repo";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    debts?: Parameters<typeof runAcordo>[0]["debts"];
    disponivelMes?: number;
    meses?: number;
    descontoVista?: number;
    useSession?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let debts = Array.isArray(body.debts) ? body.debts : [];
  let disponivel = typeof body.disponivelMes === "number" ? body.disponivelMes : undefined;

  if (!debts.length || body.useSession) {
    try {
      const session = await auth();
      const dash = await getDashboard(session?.user?.email);
      debts = debtsFromDashboard(dash.dividas);
      if (disponivel == null) {
        disponivel = runAtlas({ debts }).disponivelMes;
      }
    } catch {
      /* keep */
    }
  }

  if (disponivel == null) {
    disponivel = runAtlas({ debts }).disponivelMes;
  }

  const result = runAcordo({
    debts,
    disponivelMes: disponivel,
    meses: body.meses,
    descontoVista: body.descontoVista,
  });

  appendAudit({
    actor: "sistema",
    agent: "acordo",
    action: "simular",
    band: result.band,
    payload: { n: result.propostas.length },
  });

  return NextResponse.json(result);
}
