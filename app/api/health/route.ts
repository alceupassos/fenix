import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/lib/db";
import { getClaraModel } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { hasKey, provider, modelId } = getClaraModel();
  let database: "up" | "down" | "mock" = hasDb ? "down" : "mock";
  if (db) {
    try {
      await db.execute(sql`select 1`);
      database = "up";
    } catch {
      database = "down";
    }
  }

  const body = {
    ok: true,
    service: "sociedade-fenix",
    version: "0.2.0",
    time: new Date().toISOString(),
    checks: {
      database,
      ai: hasKey ? { provider, modelId, configured: true } : { configured: false },
      agents: [
        "clara",
        "farol",
        "atlas",
        "iris",
        "acordo",
        "oficina",
        "ponte",
        "vigia",
        "aurora",
        "defensor",
        "superendividamento",
        "escudo",
      ],
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
