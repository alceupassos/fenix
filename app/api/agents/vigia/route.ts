import { NextResponse } from "next/server";
import { prazosFromDashboard, runVigia } from "@/lib/agents/vigia";
import { getDashboard } from "@/lib/repo";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const dash = await getDashboard(session?.user?.email);
    return NextResponse.json(runVigia({ prazos: prazosFromDashboard(dash.prazos) }));
  } catch {
    return NextResponse.json(runVigia({ prazos: [] }));
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (Array.isArray(body?.prazos)) {
      return NextResponse.json(runVigia({ prazos: body.prazos }));
    }
  } catch {
    /* fallthrough */
  }
  return GET();
}
