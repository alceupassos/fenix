import { NextResponse } from "next/server";
import { debtsFromDashboard, runAtlas, type AtlasDebtInput, type AtlasInput } from "@/lib/agents/atlas";
import { getDashboard } from "@/lib/repo";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<AtlasInput> & { useSessionDebts?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let debts: AtlasDebtInput[] = Array.isArray(body.debts) ? body.debts : [];

  if ((!debts.length && body.useSessionDebts !== false) || body.useSessionDebts === true) {
    try {
      const session = await auth();
      const email = session?.user?.email;
      const dash = await getDashboard(email);
      debts = debtsFromDashboard(dash.dividas);
    } catch {
      // keep provided debts / empty
    }
  }

  const result = runAtlas({
    debts,
    rendaMensal: typeof body.rendaMensal === "number" ? body.rendaMensal : undefined,
    despesasEssenciais: typeof body.despesasEssenciais === "number" ? body.despesasEssenciais : undefined,
    controleManual: typeof body.controleManual === "number" ? body.controleManual : undefined,
  });

  return NextResponse.json(result);
}

export async function GET() {
  try {
    const session = await auth();
    const dash = await getDashboard(session?.user?.email);
    const result = runAtlas({ debts: debtsFromDashboard(dash.dividas) });
    return NextResponse.json(result);
  } catch {
    const result = runAtlas({ debts: [] });
    return NextResponse.json(result);
  }
}
