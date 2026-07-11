import { NextResponse } from "next/server";
import { runEscudo } from "@/lib/agents/escudo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(
      runEscudo({
        textoContrato: typeof body.textoContrato === "string" ? body.textoContrato : "",
        tipo: body.tipo,
      }),
    );
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
}
