import { auth } from "@/auth";
import { createCheckout, hasAbacatePay, type PlanKey } from "@/lib/abacatepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AbacatePay checkout:
 * - assinatura → R$ 99/mês (subscription checkout)
 * - pacote → R$ 149 one-time (PIX + CARD)
 */
export async function POST(req: Request) {
  // Not configured yet → 503 so the client falls back gracefully (login).
  if (!hasAbacatePay) {
    return Response.json({ error: "abacatepay-not-configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let plan: PlanKey = "assinatura";
  try {
    const body = await req.json();
    if (body?.plan === "pacote" || body?.plan === "assinatura") plan = body.plan;
  } catch {
    /* default assinatura */
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const checkout = await createCheckout({
      plan,
      customerEmail: session.user.email,
      returnUrl: `${origin}/#planos`,
      completionUrl: `${origin}/painel?checkout=success`,
    });
    return Response.json({ url: checkout.url, id: checkout.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "checkout-failed";
    if (msg === "not-configured") {
      return Response.json({ error: "abacatepay-not-configured" }, { status: 503 });
    }
    return Response.json({ error: "checkout-failed" }, { status: 502 });
  }
}
