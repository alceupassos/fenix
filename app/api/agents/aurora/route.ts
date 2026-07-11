import { NextResponse } from "next/server";
import { runAurora } from "@/lib/agents/aurora";
import { debtsFromDashboard, runAtlas } from "@/lib/agents/atlas";
import { getDashboard } from "@/lib/repo";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const dash = await getDashboard(session?.user?.email);
    const atlas = runAtlas({ debts: debtsFromDashboard(dash.dividas) });
    return NextResponse.json(
      runAurora({
        controleAtual: atlas.controle90d,
        diasDesdeInicio: 21,
        eventos: [
          { data: "2026-07-01", tipo: "marco", titulo: "Mapa inicial", impacto: 5 },
          { data: "2026-07-08", tipo: "reclamacao", titulo: "Reclamação FinanCred", impacto: 3 },
        ],
      }),
    );
  } catch {
    return NextResponse.json(runAurora({ controleAtual: 40 }));
  }
}
