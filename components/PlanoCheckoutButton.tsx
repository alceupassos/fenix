"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Starts an AbacatePay Checkout for a paid plan (Pix + card).
 * If AbacatePay isn't configured yet (503) or the user isn't signed in (401),
 * it falls back gracefully: sends the user to /login (then /painel)
 * instead of erroring.
 */
export default function PlanoCheckoutButton({
  plan,
  className,
  style,
  children,
}: {
  plan: "assinatura" | "pacote";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        router.push("/login?callbackUrl=/painel");
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      // AbacatePay not configured yet (503), or any other issue → graceful fallback.
      router.push("/login?callbackUrl=/painel");
    } catch {
      router.push("/login?callbackUrl=/painel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={start} disabled={busy} className={className} style={{ ...style, opacity: busy ? 0.7 : 1 }}>
      {children}
    </button>
  );
}
