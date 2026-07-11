import { NextResponse } from "next/server";
import { runPonte, type PonteTema } from "@/lib/agents/ponte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { tema?: PonteTema; freeText?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return NextResponse.json(runPonte(body));
}

export async function GET(req: Request) {
  const tema = new URL(req.url).searchParams.get("tema") as PonteTema | null;
  return NextResponse.json(runPonte({ tema: tema ?? undefined }));
}
