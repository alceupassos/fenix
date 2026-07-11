"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SCREENS: [string, string][] = [
  ["/", "Página inicial"],
  ["/chat", "Conversa com a Clara"],
  ["/urgente", "Ajuda urgente"],
  ["/painel", "Painel do usuário"],
  ["/advogado", "Painel do advogado"],
];

/**
 * Dev-only reproduction of the prototype's "Protótipo · Telas" pill bar.
 * Rendered only outside production so the shipped product has no scaffolding.
 */
export default function DevScreenSwitcher() {
  const pathname = usePathname();
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: "#0A1730",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        padding: "9px 18px",
      }}
    >
      <span
        style={{
          fontSize: 10,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,.45)",
          fontWeight: 700,
          marginRight: 4,
        }}
      >
        Protótipo · Telas
      </span>
      {SCREENS.map(([href, label]) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              font: "inherit",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 999,
              padding: "6px 14px",
              background: active ? "#4ECDC4" : "rgba(255,255,255,.08)",
              color: active ? "#0A1730" : "rgba(255,255,255,.75)",
              transition: "all .15s",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
