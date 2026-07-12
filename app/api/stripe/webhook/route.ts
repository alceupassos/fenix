/**
 * @deprecated Stripe webhook — retired in favor of AbacatePay.
 * Prefer POST /api/abacatepay/webhook
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "stripe-retired",
      message: "Use /api/abacatepay/webhook",
    },
    { status: 410 },
  );
}
