import { auth } from "@/auth";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Not configured yet → 503 so the client falls back gracefully.
  if (!stripe) return Response.json({ error: "stripe-not-configured" }, { status: 503 });

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

  const cfg = PLANS[plan];
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: cfg.mode,
      customer_email: session.user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            product_data: { name: cfg.label },
            unit_amount: cfg.amount,
            ...(cfg.mode === "subscription" ? { recurring: { interval: cfg.interval! } } : {}),
          },
        },
      ],
      metadata: { plan, email: session.user.email },
      success_url: `${origin}/painel?checkout=success`,
      cancel_url: `${origin}/#planos`,
    });
    return Response.json({ url: checkout.url });
  } catch {
    return Response.json({ error: "checkout-failed" }, { status: 502 });
  }
}
