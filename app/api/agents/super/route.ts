import { NextResponse } from "next/server";
import { runSuperendividamento } from "@/lib/agents/superendividamento";
import { debtsFromDashboard, runAtlas } from "@/lib/agents/atlas";
import { getDashboard } from "@/lib/repo";
import { auth } from "@/auth";
import { appendAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const dash = await getDashboard(session?.user?.email);
    const debts = debtsFromDashboard(dash.dividas);
    const atlas = runAtlas({ debts });
    const result = runSuperendividamento({
      debts,
      rendaMensal: atlas.rendaMensal,
      despesasEssenciais: atlas.despesasEssenciais,
      temProcessoCobranca: debts.some((d) => /ju[ií]zo/i.test(d.status)),
      dependentes: 1,
    });
    appendAudit({
      actor: session?.user?.email ?? "anon",
      agent: "superendividamento",
      action: "triagem",
      band: result.band,
      requiresLawyerReview: true,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      runSuperendividamento({ debts: [], rendaMensal: 0, despesasEssenciais: 0 }),
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = runSuperendividamento({
      debts: body.debts ?? [],
      rendaMensal: Number(body.rendaMensal) || 0,
      despesasEssenciais: Number(body.despesasEssenciais) || 0,
      temProcessoCobranca: Boolean(body.temProcessoCobranca),
      dependentes: body.dependentes,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
}
