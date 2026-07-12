/**
 * @deprecated Stripe is no longer the primary payment provider.
 * Use `@/lib/abacatepay` (AbacatePay: Pix + card) instead.
 *
 * Kept as a legacy stub so existing imports (`stripe`, `hasStripe`, `PLANS`,
 * `PlanKey`) and the optional Stripe webhook route do not break the build.
 * The `stripe` npm package remains in package.json until Maestro removes it.
 */

import Stripe from "stripe";

/** Always false — Stripe is retired as primary. Prefer `hasAbacatePay`. */
export const hasStripe = false;

/**
 * Null-safe Stripe client. Still constructs if STRIPE_SECRET_KEY is set
 * (legacy webhook only); prefer AbacatePay for new checkout flows.
 */
const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key ? new Stripe(key) : null;

export type PlanKey = "assinatura" | "pacote";

/** @deprecated Prefer `PLANS` from `@/lib/abacatepay`. */
export const PLANS: Record<
  PlanKey,
  { label: string; amount: number; mode: "subscription" | "payment"; interval?: "month" }
> = {
  assinatura: { label: "Assinatura Fênix", amount: 9900, mode: "subscription", interval: "month" },
  pacote: { label: "Pacote de organização Fênix", amount: 14900, mode: "payment" },
};
