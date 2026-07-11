"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { urgLabels } from "@/lib/data";
import { runFarol, type FarolResult } from "@/lib/agents/farol";

export default function Urgente() {
  const router = useRouter();
  const [sel, setSel] = useState<Record<number, boolean>>({});
  const [triage, setTriage] = useState<FarolResult | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedLabels = useMemo(
    () => urgLabels.filter((_, i) => !!sel[i]),
    [sel],
  );

  const anySelected = selectedLabels.length > 0;

  async function pedirPrioridade() {
    if (!anySelected) return;
    setLoading(true);
    try {
      // Prefer API (audit trail server-side); fall back to local rules if offline
      let result: FarolResult;
      try {
        const res = await fetch("/api/agents/farol", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedLabels }),
        });
        result = res.ok ? ((await res.json()) as FarolResult) : runFarol({ selectedLabels });
      } catch {
        result = runFarol({ selectedLabels });
      }
      setTriage(result);

      // Persist for Clara chat context
      try {
        sessionStorage.setItem(
          "fenix_farol",
          JSON.stringify({
            band: result.band,
            score: result.priorityScore,
            signals: result.signals,
            humanQueue: result.humanQueue,
            summary: result.summary,
          }),
        );
      } catch {
        /* ignore */
      }

      // Red band / citation → chat with urgent flag; mild → still chat but slower path
      const q = new URLSearchParams({ urgente: "1", faixa: result.band, score: String(result.priorityScore) });
      router.push(`/chat?${q.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  const bandColor =
    triage?.band === "vermelha" ? "#E2574C" : triage?.band === "amarela" ? "#D98324" : "#12A5A5";

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
            <p style={{ fontSize: 13.5, color: "#54627F", margin: "2px 0 0" }}>
              Marque o que está acontecendo. O Farol classifica a urgência — casos críticos entram na fila humana.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {urgLabels.map((label, i) => {
            const on = !!sel[i];
            return (
              <button
                key={i}
                onClick={() => {
                  setSel((s) => ({ ...s, [i]: !on }));
                  setTriage(null);
                }}
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

        {anySelected && !triage && (
          <p style={{ fontSize: 12.5, color: "#54627F", margin: "-8px 0 16px" }}>
            {selectedLabels.length} sinal(is) marcado(s). O Farol vai priorizar sem inventar risco.
          </p>
        )}

        {triage && (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 16,
              background: "#F5F7FB",
              border: `1.5px solid ${bandColor}33`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: bandColor, letterSpacing: ".06em", textTransform: "uppercase" }}>
              Farol · faixa {triage.band} · score {triage.priorityScore}
            </div>
            <p style={{ fontSize: 13.5, margin: "6px 0 0", color: "#3E4E6C", lineHeight: 1.5 }}>{triage.summary}</p>
          </div>
        )}

        <button
          onClick={pedirPrioridade}
          disabled={!anySelected || loading}
          className="h-btn-lift1"
          style={{
            font: "inherit",
            width: "100%",
            fontSize: 16,
            fontWeight: 800,
            cursor: !anySelected || loading ? "not-allowed" : "pointer",
            opacity: !anySelected || loading ? 0.55 : 1,
            border: "none",
            borderRadius: 999,
            padding: 17,
            color: "#fff",
            background: "var(--grad-orange)",
            boxShadow: "0 12px 30px rgba(238,110,69,.4)",
          }}
        >
          {loading ? "Classificando com o Farol…" : "Pedir atendimento prioritário"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 16,
            fontSize: 12.5,
            color: "#657493",
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
            color: "#54627F",
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
