/**
 * AbacatePay null-safe client (primary payment provider for Sociedade Fênix).
 *
 * ## Assumed / documented API (AbacatePay REST v2)
 * Base URL default: `https://api.abacatepay.com/v2`
 * (override with `ABACATEPAY_API_URL`; older docs referenced `/v1`).
 *
 * Auth: `Authorization: Bearer <ABACATEPAY_API_KEY>`
 * Money: always centavos BRL.
 * Response envelope: `{ data: T, success: boolean, error: string | null }`
 *
 * Endpoints used:
 * - `POST /products/create` — ensure catalog product (externalId + name + price)
 * - `POST /customers/create` — upsert customer by email (taxId optional)
 * - `POST /checkouts/create` — one-shot checkout (pacote); methods PIX + CARD
 * - `POST /subscriptions/create` — recurring (assinatura); product must have cycle
 *
 * Optional product IDs (skip auto-create):
 * - `ABACATEPAY_PRODUCT_ASSINATURA`
 * - `ABACATEPAY_PRODUCT_PACOTE`
 *
 * Webhooks: HMAC-SHA256 of raw body with `ABACATEPAY_WEBHOOK_SECRET`
 * (header typically `X-Webhook-Signature`; base64 or hex digest accepted).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type PlanKey = "assinatura" | "pacote";

export const PLANS: Record<
  PlanKey,
  {
    label: string;
    amount: number;
    mode: "subscription" | "payment";
    /** AbacatePay product externalId used when auto-creating products. */
    externalId: string;
    cycle?: "MONTHLY";
  }
> = {
  assinatura: {
    label: "Assinatura Fênix",
    amount: 9900,
    mode: "subscription",
    externalId: "fenix-assinatura",
    cycle: "MONTHLY",
  },
  pacote: {
    label: "Pacote de organização Fênix",
    amount: 14900,
    mode: "payment",
    externalId: "fenix-pacote",
  },
};

const API_KEY = process.env.ABACATEPAY_API_KEY;
const API_URL = (process.env.ABACATEPAY_API_URL ?? "https://api.abacatepay.com/v2").replace(/\/$/, "");

export const hasAbacatePay = Boolean(API_KEY);

/** In-process cache of product public ids keyed by plan externalId. */
const productIdCache = new Map<string, string>();

type ApiEnvelope<T> = {
  data?: T | null;
  success?: boolean;
  error?: string | null;
};

export type CheckoutResult = { id: string; url: string };

export type CreateCheckoutInput = {
  plan: PlanKey;
  customerEmail: string;
  returnUrl: string;
  completionUrl: string;
};

function notConfigured(): never {
  throw new Error("not-configured");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_KEY) notConfigured();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg = body?.error ?? `abacatepay-http-${res.status}`;
    throw new Error(msg);
  }
  if (body?.error) throw new Error(body.error);
  if (body?.data == null) throw new Error("abacatepay-empty-response");
  return body.data;
}

function envProductId(plan: PlanKey): string | undefined {
  if (plan === "assinatura") return process.env.ABACATEPAY_PRODUCT_ASSINATURA || undefined;
  return process.env.ABACATEPAY_PRODUCT_PACOTE || undefined;
}

/**
 * Ensure a catalog product exists for the plan and return its public id.
 * Prefers env override; otherwise creates via POST /products/create (idempotent-ish by externalId).
 */
async function ensureProduct(plan: PlanKey): Promise<string> {
  const fromEnv = envProductId(plan);
  if (fromEnv) return fromEnv;

  const cfg = PLANS[plan];
  const cached = productIdCache.get(cfg.externalId);
  if (cached) return cached;

  try {
    const product = await apiFetch<{ id: string }>("/products/create", {
      method: "POST",
      body: JSON.stringify({
        externalId: cfg.externalId,
        name: cfg.label,
        price: cfg.amount,
        currency: "BRL",
        description: cfg.label,
        ...(cfg.cycle ? { cycle: cfg.cycle } : {}),
      }),
    });
    productIdCache.set(cfg.externalId, product.id);
    return product.id;
  } catch {
    // Product may already exist — list and match by externalId.
    try {
      const list = await apiFetch<Array<{ id: string; externalId?: string }>>("/products/list", {
        method: "GET",
      });
      const found = Array.isArray(list)
        ? list.find((p) => p.externalId === cfg.externalId)
        : undefined;
      if (found?.id) {
        productIdCache.set(cfg.externalId, found.id);
        return found.id;
      }
    } catch {
      /* rethrow original path below */
    }
    throw new Error(`abacatepay-product-missing:${cfg.externalId}`);
  }
}

/** Create or reuse a customer; returns customer id when available. */
async function ensureCustomer(email: string): Promise<string | undefined> {
  try {
    const customer = await apiFetch<{ id: string }>("/customers/create", {
      method: "POST",
      body: JSON.stringify({ email: email.toLowerCase() }),
    });
    return customer.id;
  } catch {
    return undefined;
  }
}

/**
 * Create a hosted checkout (or subscription checkout) and return redirect URL.
 * Throws `not-configured` when `ABACATEPAY_API_KEY` is missing.
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
  if (!hasAbacatePay) notConfigured();

  const cfg = PLANS[input.plan];
  const productId = await ensureProduct(input.plan);
  const customerId = await ensureCustomer(input.customerEmail);

  const payload = {
    items: [{ id: productId, quantity: 1 }],
    methods: cfg.mode === "subscription" ? (["CARD"] as const) : (["PIX", "CARD"] as const),
    returnUrl: input.returnUrl,
    completionUrl: input.completionUrl,
    externalId: `fenix-${input.plan}-${Date.now()}`,
    metadata: {
      plan: input.plan,
      email: input.customerEmail.toLowerCase(),
    },
    ...(customerId ? { customerId } : {}),
  };

  const path = cfg.mode === "subscription" ? "/subscriptions/create" : "/checkouts/create";
  const billing = await apiFetch<{ id: string; url: string }>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!billing.id || !billing.url) throw new Error("abacatepay-invalid-checkout");
  return { id: billing.id, url: billing.url };
}

/**
 * Verify AbacatePay webhook HMAC-SHA256 signature (timing-safe).
 * Accepts base64 or hex digests (docs use base64 on `X-Webhook-Signature`).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const sig = signatureHeader.trim();
  // Allow "sha256=<digest>" prefix used by some providers.
  const provided = sig.startsWith("sha256=") ? sig.slice(7) : sig;

  try {
    const expectedBase64 = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

    for (const expected of [expectedBase64, expectedHex]) {
      const a = Buffer.from(expected);
      const b = Buffer.from(provided);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Null-safe helpers: throw `not-configured` when the key is missing. */
export const abacatepay = hasAbacatePay
  ? {
      createCheckout,
      verifyWebhookSignature,
      plans: PLANS,
    }
  : {
      createCheckout: (_input: CreateCheckoutInput): Promise<CheckoutResult> => {
        notConfigured();
      },
      verifyWebhookSignature: (
        _rawBody: string,
        _signatureHeader: string | null,
        _secret: string,
      ): boolean => {
        notConfigured();
      },
      plans: PLANS,
    };
