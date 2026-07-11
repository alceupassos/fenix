"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { urgLabels } from "@/lib/data";

export default function Urgente() {
  const router = useRouter();
  const [sel, setSel] = useState<Record<number, boolean>>({});

  return (
    <div
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0C1D3E, #102A54)",
        padding: "48px 22px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(640px, 100%)",
          background: "#fff",
          borderRadius: 28,
          padding: "clamp(26px, 5vw, 44px)",
          boxShadow: "0 40px 90px rgba(4,12,30,.5)",
          animation: "fxUp .4s ease both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              background: "#FDEDE7",
              color: "#E2574C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="clock" size={24} />
          </div>
          <div>
            <h2
              className="font-display"
              style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: 0 }}
            >
              Preciso de ajuda urgente
            </h2>
            <p style={{ fontSize: 13.5, color: "#6B7A96", margin: "2px 0 0" }}>
              Marque o que está acontecendo. Casos críticos entram na fila humana imediatamente.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {urgLabels.map((label, i) => {
            const on = !!sel[i];
            return (
              <button
                key={i}
                onClick={() => setSel((s) => ({ ...s, [i]: !on }))}
                style={{
                  font: "inherit",
                  fontSize: 14.5,
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  background: on ? "#FDEDE7" : "#F5F7FB",
                  border: `1.5px solid ${on ? "rgba(226,87,76,.5)" : "rgba(19,35,63,.08)"}`,
                  borderRadius: 16,
                  padding: "14px 17px",
                  color: "#13233F",
                  transition: "all .15s",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    flex: "none",
                    borderRadius: 8,
                    border: `2px solid ${on ? "#E2574C" : "rgba(19,35,63,.25)"}`,
                    background: on ? "#E2574C" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .15s",
                  }}
                >
                  {on && <Icon name="check" size={14} stroke="#fff" strokeWidth={3.5} />}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => router.push("/chat?urgente=1")}
          className="h-btn-lift1"
          style={{
            font: "inherit",
            width: "100%",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            border: "none",
            borderRadius: 999,
            padding: 17,
            color: "#fff",
            background: "var(--grad-orange)",
            boxShadow: "0 12px 30px rgba(238,110,69,.4)",
          }}
        >
          Pedir atendimento prioritário
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 16,
            fontSize: 12.5,
            color: "#8A97AE",
          }}
        >
          <Icon name="shield" size={13} strokeWidth={2.75} />
          Se houver risco à sua saúde ou segurança, ligue 190 (polícia) ou 188 (CVV).
        </div>

        <button
          onClick={() => router.push("/")}
          style={{
            font: "inherit",
            display: "block",
            margin: "14px auto 0",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            background: "none",
            border: "none",
            color: "#6B7A96",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Voltar para a página inicial
        </button>
      </div>
    </div>
  );
}
