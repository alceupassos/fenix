import Stripe from "stripe";

/** Null-safe Stripe client. Activates when STRIPE_SECRET_KEY is set. */
const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key ? new Stripe(key) : null;
export const hasStripe = Boolean(key);

export type PlanKey = "assinatura" | "pacote";

/** Pricing for the two paid Planos (values in centavos, BRL). */
export const PLANS: Record<
  PlanKey,
  { label: string; amount: number; mode: "subscription" | "payment"; interval?: "month" }
> = {
  assinatura: { label: "Assinatura Fênix", amount: 9900, mode: "subscription", interval: "month" },
  pacote: { label: "Pacote de organização Fênix", amount: 14900, mode: "payment" },
};
