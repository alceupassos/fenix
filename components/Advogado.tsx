"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import { casosData, advTabs, cronologia, analise, fontes, type Caso } from "@/lib/data";
import type { FenixAction, FenixDecision } from "@/lib/fenix-button";

type AdvTab = "resumo" | "analise" | "minuta";

const ACTION_BTNS: { action: FenixAction; label: string; primary?: boolean; urgent?: boolean }[] = [
  { action: "aprovar", label: "Aprovar e prosseguir", primary: true },
  { action: "aprovar_com_alteracoes", label: "Editar e aprovar" },
  { action: "solicitar_documentos", label: "Solicitar documentos" },
  { action: "encaminhar_humano", label: "Assumir atendimento" },
  { action: "marcar_urgente", label: "Marcar como urgente", urgent: true },
  { action: "rejeitar", label: "Rejeitar medida", urgent: true },
];

export default function Advogado({
  nome = "Dr. Leandro Giannasi",
  oab = "OAB/SP 312.456",
  casos = casosData,
}: {
  nome?: string;
  oab?: string;
  casos?: Caso[];
}) {
  const [caseIdx, setCaseIdx] = useState(0);
  const [tab, setTab] = useState<AdvTab>("resumo");
  const [decision, setDecision] = useState<FenixDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<FenixDecision[]>([]);
  const caso = casos[caseIdx];
  const caseId = `case-${caseIdx}-${caso.nome.replace(/\s/g, "")}`;

  const openCase = (i: number) => {
    setCaseIdx(i);
    setTab("resumo");
    setDecision(null);
    setErr(null);
    setHistory([]);
  };

  const runAction = useCallback(
    async (action: FenixAction) => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/fenix/button", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            caseTitle: caso.titulo,
            action,
            minutaVersion: 3,
            notes: action === "aprovar_com_alteracoes" ? "Alterações aplicadas pelo advogado na minuta." : undefined,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Erro ${res.status}`);
        }
        const d = (await res.json()) as FenixDecision;
        setDecision(d);
        setHistory((h) => [d, ...h]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Falha no Botão Fênix");
      } finally {
        setBusy(false);
      }
    },
    [caseId, caso.titulo],
  );

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "stretch", background: "#F5F7FB", height: "100vh" }}>
      <aside
        style={{
          width: 330,
          flex: "none",
          background: "#fff",
          borderRight: "1px solid rgba(19,35,63,.08)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "100vh",
        }}
      >
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(19,35,63,.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <Image src="/fenix-mark.png" alt="" width={26} height={25} style={{ width: 26, height: "auto" }} />
            <strong className="font-display" style={{ fontWeight: 800, fontSize: 15 }}>
              Botão Fênix
            </strong>
          </div>
          <div style={{ fontSize: 12, color: "#54627F" }}>
            Fila de revisão · {nome} · {oab}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {casos.map((cs, i) => {
            const active = caseIdx === i;
            return (
              <button
                key={i}
                onClick={() => openCase(i)}
                style={{
                  font: "inherit",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  background: active ? "#EAF0F9" : "#fff",
                  border: `1.5px solid ${active ? "rgba(43,75,143,.45)" : "rgba(19,35,63,.08)"}`,
                  borderRadius: 16,
                  padding: 15,
                  marginBottom: 9,
                  transition: "all .15s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 14, flex: 1 }}>{cs.nome}</strong>
                  <span
                    style={{
                      background: cs.chipBg,
                      color: cs.chipColor,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".05em",
                      textTransform: "uppercase",
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    {cs.chip}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#556482", lineHeight: 1.45 }}>{cs.materia}</div>
                <div style={{ fontSize: 11.5, color: "#657493", display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="clock" size={12} strokeWidth={2.75} />
                  {cs.prazo}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "clamp(20px, 3vw, 36px)", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="font-display" style={{ fontWeight: 800, fontSize: "clamp(21px, 2.6vw, 27px)", letterSpacing: "-.02em", margin: "0 0 4px" }}>
              {caso.titulo}
            </h1>
            <p style={{ fontSize: 13.5, color: "#54627F", margin: 0 }}>{caso.sub}</p>
          </div>
          <span
            style={{
              background: "#FDEDE7",
              color: "#C2451F",
              fontSize: 12,
              fontWeight: 800,
              borderRadius: 999,
              padding: "8px 16px",
              whiteSpace: "nowrap",
            }}
          >
            {caso.prazoChip}
          </span>
          <LogoutButton />
        </div>

        {decision && (
          <div
            style={{
              background: decision.canProtocol ? "#E6F7F6" : "#FFF3E6",
              border: `1.5px solid ${decision.canProtocol ? "rgba(18,165,165,.5)" : "rgba(217,131,36,.45)"}`,
              borderRadius: 18,
              padding: "18px 22px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 14,
              animation: "fxUp .3s ease both",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                flex: "none",
                borderRadius: "50%",
                background: decision.canProtocol ? "#12A5A5" : "#D98324",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="check" size={20} strokeWidth={3} />
            </div>
            <div>
              <strong style={{ fontSize: 14.5, color: decision.canProtocol ? "#0C6E6E" : "#9A5B1F" }}>
                {decision.statusLabel}
              </strong>
              <div style={{ fontSize: 12.5, color: "#3E4E6C", marginTop: 2 }}>
                {decision.actorName}
                {decision.actorOab ? ` · ${decision.actorOab}` : ""} ·{" "}
                {new Date(decision.at).toLocaleString("pt-BR")} · v{decision.minutaVersion} · trilha {decision.id}
                {decision.canProtocol ? " · liberado para protocolo" : " · não protocolar ainda"}
              </div>
            </div>
          </div>
        )}

        {err && (
          <div style={{ background: "#FDEDE7", color: "#C2451F", borderRadius: 14, padding: "12px 16px", marginBottom: 16, fontSize: 13.5, fontWeight: 600 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {advTabs.map((at) => {
            const active = tab === at.id;
            return (
              <button
                key={at.id}
                onClick={() => setTab(at.id)}
                style={{
                  font: "inherit",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: 999,
                  padding: "9px 18px",
                  background: active ? "#13233F" : "#fff",
                  color: active ? "#fff" : "#3E4E6C",
                  transition: "all .15s",
                }}
              >
                {at.label}
              </button>
            );
          })}
        </div>

        {tab === "resumo" && <TabResumo resumo={caso.resumo} />}
        {tab === "analise" && <TabAnalise />}
        {tab === "minuta" && <TabMinuta titulo={caso.minutaTitulo} texto={caso.minuta} />}

        {history.length > 0 && (
          <div style={{ ...panelCard, marginTop: 16 }}>
            <H4>Trilha Botão Fênix (esta sessão)</H4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#3E4E6C", lineHeight: 1.6 }}>
              {history.map((h) => (
                <li key={h.id}>
                  <strong>{h.action}</strong> — {h.statusLabel} · {new Date(h.at).toLocaleTimeString("pt-BR")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: 22,
            background: "rgba(245,247,251,.9)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(19,35,63,.08)",
            padding: "16px 0 4px",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {ACTION_BTNS.map((btn) => (
            <button
              key={btn.action}
              onClick={() => runAction(btn.action)}
              disabled={busy}
              className={btn.primary ? "h-btn-lift1" : btn.urgent ? "h-urgent" : "h-btn-outline-dark"}
              style={{
                font: "inherit",
                fontSize: 14,
                fontWeight: btn.primary ? 800 : 700,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.6 : 1,
                border: btn.primary ? "none" : btn.urgent ? "1.5px solid rgba(226,87,76,.35)" : "1.5px solid rgba(19,35,63,.15)",
                borderRadius: 999,
                padding: btn.primary ? "13px 26px" : "12px 22px",
                color: btn.primary ? "#fff" : btn.urgent ? "#C2451F" : "#13233F",
                background: btn.primary
                  ? "linear-gradient(135deg, #12A5A5, #0F8B8B)"
                  : btn.urgent
                    ? "#FDEDE7"
                    : "#fff",
                boxShadow: btn.primary ? "0 10px 24px rgba(18,165,165,.35)" : undefined,
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              {btn.primary && <Icon name="check" size={16} strokeWidth={3} />}
              {btn.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

const panelCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
  borderRadius: 20,
  padding: 22,
};

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-display" style={{ fontWeight: 800, fontSize: 15, margin: "0 0 12px" }}>
      {children}
    </h4>
  );
}

function TabResumo({ resumo }: { resumo: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
      <div style={panelCard}>
        <H4>O que aconteceu</H4>
        <p style={{ fontSize: 13.5, color: "#3E4E6C", lineHeight: 1.65, margin: 0 }}>{resumo}</p>
      </div>
      <div style={panelCard}>
        <H4>Cronologia</H4>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {cronologia.map((cr, i) => (
            <div key={i} style={{ display: "flex", gap: 11, fontSize: 13 }}>
              <span style={{ flex: "none", fontWeight: 800, color: "#12A5A5", width: 52 }}>{cr.data}</span>
              <span style={{ color: "#3E4E6C", lineHeight: 1.5 }}>{cr.fato}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabAnalise() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
      <div style={panelCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h4 className="font-display" style={{ fontWeight: 800, fontSize: 15, margin: 0, flex: 1 }}>
            Análise preparada pela IA
          </h4>
          <span style={{ background: "#E6F7F6", color: "#0C6E6E", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "4px 12px" }}>
            confiança 87%
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {analise.map((an, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, lineHeight: 1.55 }}>
              <span
                style={{
                  flex: "none",
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: an.bg,
                  color: an.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={an.icon} size={12} strokeWidth={3} />
              </span>
              <span style={{ color: "#3E4E6C" }}>
                <strong style={{ color: "#13233F" }}>{an.rotulo}:</strong> {an.texto}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={panelCard}>
        <H4>Fontes verificadas</H4>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, color: "#3E4E6C" }}>
          {fontes.map((ft, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "baseline" }}>
              <Icon name="check" size={12} stroke="#12A5A5" strokeWidth={3} style={{ flex: "none", transform: "translateY(1px)" }} />
              <span style={{ lineHeight: 1.5 }}>{ft}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            background: "#FFF7ED",
            border: "1px solid rgba(245,163,79,.4)",
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 12,
            color: "#9A5B1F",
            lineHeight: 1.5,
          }}
        >
          Nenhuma jurisprudência sem tribunal/número/ementa confirmados. Peças jurídicas só após Botão Fênix.
        </div>
      </div>
    </div>
  );
}

function TabMinuta({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={panelCard}>
      <H4>{titulo}</H4>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "#3E4E6C",
          background: "#F5F7FB",
          borderRadius: 14,
          padding: 16,
        }}
      >
        {texto}
      </pre>
    </div>
  );
}
