import { verifyWebhookSignature } from "@/lib/abacatepay";
import { recordSubscription } from "@/lib/repo";
import type { PlanKey } from "@/lib/abacatepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** In-memory idempotency for webhook event ids (process lifetime). */
const seenEventIds = new Set<string>();

const PAID_EVENTS = new Set([
  "checkout.completed",
  "billing.paid",
  "subscription.completed",
  "subscription.renewed",
]);

function signatureFromHeaders(req: Request): string | null {
  return (
    req.headers.get("x-webhook-signature") ??
    req.headers.get("x-abacate-signature") ??
    req.headers.get("x-abacatepay-signature") ??
    req.headers.get("x-signature")
  );
}

async function markEventProcessed(
  eventId: string,
  type: string,
  payload: unknown,
): Promise<"new" | "duplicate"> {
  if (seenEventIds.has(eventId)) return "duplicate";
  seenEventIds.add(eventId);
  // Cap memory growth in long-lived processes.
  if (seenEventIds.size > 5000) {
    const first = seenEventIds.values().next().value;
    if (first) seenEventIds.delete(first);
  }

  try {
    // Optional DB idempotency (Maestro may add recordPaymentEvent).
    const mod = (await import("@/lib/repo")) as {
      recordPaymentEvent?: (input: {
        id: string;
        provider?: string;
        type: string;
        payload?: unknown;
      }) => Promise<"new" | "duplicate" | void>;
    };
    if (typeof mod.recordPaymentEvent === "function") {
      const result = await mod.recordPaymentEvent({
        id: eventId,
        provider: "abacatepay",
        type,
        payload,
      });
      if (result === "duplicate") return "duplicate";
    }
  } catch {
    /* memory-only fallback */
  }

  return "new";
}

function extractPlan(data: Record<string, unknown> | null | undefined): PlanKey {
  const meta = (data?.metadata ?? {}) as { plan?: string };
  if (meta.plan === "pacote" || meta.plan === "assinatura") return meta.plan;
  const externalId = typeof data?.externalId === "string" ? data.externalId : "";
  if (externalId.includes("pacote")) return "pacote";
  return "assinatura";
}

function extractEmail(data: Record<string, unknown> | null | undefined): string | undefined {
  const meta = (data?.metadata ?? {}) as { email?: string };
  if (meta.email) return meta.email;
  const customer = data?.customer as { email?: string } | null | undefined;
  if (customer?.email) return customer.email;
  if (typeof data?.customerEmail === "string") return data.customerEmail;
  return undefined;
}

export async function POST(req: Request) {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const isDev = process.env.NODE_ENV === "development";
  const raw = await req.text();
  const sig = signatureFromHeaders(req);

  if (!secret) {
    if (!isDev) {
      return Response.json({ error: "abacatepay-webhook-not-configured" }, { status: 503 });
    }
    // Dev without secret: accept with warning (do not use in production).
    console.warn("[abacatepay/webhook] ABACATEPAY_WEBHOOK_SECRET missing — accepting in development only");
  } else {
    const ok = verifyWebhookSignature(raw, sig, secret);
    // Also accept webhookSecret query param (AbacatePay URL secret layer).
    const urlSecret = new URL(req.url).searchParams.get("webhookSecret");
    const queryOk = Boolean(urlSecret && urlSecret === secret);
    if (!ok && !queryOk) {
      return Response.json({ error: "invalid-signature" }, { status: 400 });
    }
  }

  let event: {
    id?: string;
    event?: string;
    type?: string;
    data?: Record<string, unknown> | null;
    devMode?: boolean;
  };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400 });
  }

  const eventType = event.event ?? event.type ?? "unknown";
  const eventId =
    event.id ??
    (typeof event.data?.id === "string" ? `evt-${eventType}-${event.data.id}` : `evt-${eventType}-${Date.now()}`);

  const idem = await markEventProcessed(eventId, eventType, event);
  if (idem === "duplicate") {
    return Response.json({ received: true, duplicate: true });
  }

  if (PAID_EVENTS.has(eventType)) {
    const data = event.data ?? null;
    const email = extractEmail(data);
    const plan = extractPlan(data);
    if (email) {
      // Repo may not yet persist abacate* columns — leave stripe fields empty, status active.
      await recordSubscription({
        email,
        plan,
        status: "active",
      });
    }
  }

  return Response.json({
    received: true,
    ...( !secret && isDev ? { warning: "webhook-secret-missing" } : {}),
  });
}
