import { NextResponse } from "next/server";
import { runFarol, type FarolInput } from "@/lib/agents/farol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: FarolInput = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const result = runFarol({
    selectedLabels: Array.isArray(body.selectedLabels) ? body.selectedLabels : [],
    freeText: typeof body.freeText === "string" ? body.freeText : undefined,
  });

  return NextResponse.json(result);
}
