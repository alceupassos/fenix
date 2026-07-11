"use client";

import { signOut } from "next-auth/react";
import { Icon } from "@/components/Icon";

export default function LogoutButton({ dark = false }: { dark?: boolean }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      title="Sair"
      aria-label="Sair"
      style={{
        font: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
        fontSize: 12.5,
        fontWeight: 700,
        borderRadius: 999,
        padding: "8px 14px",
        border: dark ? "1.5px solid rgba(255,255,255,.2)" : "1.5px solid rgba(19,35,63,.12)",
        background: "transparent",
        color: dark ? "rgba(255,255,255,.8)" : "#3E4E6C",
        transition: "all .15s",
      }}
    >
      <Icon name="arrowLeft" size={14} strokeWidth={2.75} />
      Sair
    </button>
  );
}
