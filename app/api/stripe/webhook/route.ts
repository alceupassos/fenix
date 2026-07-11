import { stripe } from "@/lib/stripe";
import { recordSubscription } from "@/lib/repo";
import type { PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!stripe) return new Response("stripe-not-configured", { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event;
  try {
    event =
      secret && sig
        ? stripe.webhooks.constructEvent(raw, sig, secret)
        : (JSON.parse(raw) as ReturnType<typeof JSON.parse>);
  } catch {
    return new Response("invalid-signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as {
      customer_email?: string | null;
      customer?: string | null;
      subscription?: string | null;
      id?: string;
      metadata?: { plan?: string; email?: string };
    };
    const email = s.customer_email ?? s.metadata?.email;
    const plan = (s.metadata?.plan as PlanKey) ?? "assinatura";
    if (email) {
      await recordSubscription({
        email,
        plan,
        status: "active",
        stripeCustomerId: s.customer ?? undefined,
        stripeSubscriptionId: s.subscription ?? undefined,
        stripeCheckoutSessionId: s.id,
      });
    }
  }

  return Response.json({ received: true });
}
