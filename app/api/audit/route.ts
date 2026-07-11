import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "advogado") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);
  return NextResponse.json({ events: listAudit(Math.min(200, limit)) });
}
