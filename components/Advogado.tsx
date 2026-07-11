"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import { casosData, advTabs, cronologia, analise, fontes, type Caso } from "@/lib/data";

type AdvTab = "resumo" | "analise" | "minuta";

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
  const [aprovado, setAprovado] = useState(false);
  const caso = casos[caseIdx];

  const openCase = (i: number) => {
    setCaseIdx(i);
    setTab("resumo");
    setAprovado(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "stretch", background: "#F5F7FB", height: "100vh" }}>
      {/* Queue */}
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
          <div style={{ fontSize: 12, color: "#6B7A96" }}>
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
                <div style={{ fontSize: 11.5, color: "#8A97AE", display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="clock" size={12} strokeWidth={2.75} />
                  {cs.prazo}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Dossier */}
      <main style={{ flex: 1, minWidth: 0, padding: "clamp(20px, 3vw, 36px)", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="font-display" style={{ fontWeight: 800, fontSize: "clamp(21px, 2.6vw, 27px)", letterSpacing: "-.02em", margin: "0 0 4px" }}>
              {caso.titulo}
            </h1>
            <p style={{ fontSize: 13.5, color: "#6B7A96", margin: 0 }}>{caso.sub}</p>
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

        {aprovado && (
          <div
            style={{
              background: "#E6F7F6",
              border: "1.5px solid rgba(18,165,165,.5)",
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
                background: "#12A5A5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="check" size={20} strokeWidth={3} />
            </div>
            <div>
              <strong style={{ fontSize: 14.5, color: "#0C6E6E" }}>
                Minuta aprovada e liberada para protocolo
              </strong>
              <div style={{ fontSize: 12.5, color: "#3E4E6C", marginTop: 2 }}>
                {nome} · {oab} · hoje às 14:32 · versão 3 · trilha de auditoria registrada
              </div>
            </div>
          </div>
        )}

        {/* Dossier tabs */}
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

        {/* Actions */}
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
          <button
            onClick={() => setAprovado(true)}
            className="h-btn-lift1"
            style={{
              font: "inherit",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              border: "none",
              borderRadius: 999,
              padding: "13px 26px",
              color: "#fff",
              background: "linear-gradient(135deg, #12A5A5, #0F8B8B)",
              boxShadow: "0 10px 24px rgba(18,165,165,.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <Icon name="check" size={16} strokeWidth={3} />
            Aprovar e prosseguir
          </button>
          {["Editar e aprovar", "Solicitar documentos", "Assumir atendimento"].map((label) => (
            <button
              key={label}
              className="h-btn-outline-dark"
              style={{
                font: "inherit",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                background: "#fff",
                border: "1.5px solid rgba(19,35,63,.15)",
                color: "#13233F",
                borderRadius: 999,
                padding: "12px 22px",
              }}
            >
              {label}
            </button>
          ))}
          <button
            className="h-urgent"
            style={{
              font: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              background: "#FDEDE7",
              border: "1.5px solid rgba(226,87,76,.35)",
              color: "#C2451F",
              borderRadius: 999,
              padding: "12px 22px",
            }}
          >
            Marcar como urgente
          </button>
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
            padding: "12px 14px",
            fontSize: 12,
            color: "#9A5B1F",
            lineHeight: 1.5,
          }}
        >
          Nenhuma jurisprudência é citada sem confirmação de existência, tribunal, número e conteúdo.
        </div>
      </div>
    </div>
  );
}

function TabMinuta({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ ...panelCard, padding: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h4 className="font-display" style={{ fontWeight: 800, fontSize: 15, margin: 0, flex: 1 }}>
          {titulo}
        </h4>
        <span style={{ background: "#F0F4F9", color: "#3E4E6C", fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "4px 12px" }}>
          versão 3 · gerada hoje 11:04
        </span>
      </div>
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 14.5,
          lineHeight: 1.85,
          color: "#2A3A58",
          background: "#FAFBFD",
          border: "1px solid rgba(19,35,63,.06)",
          borderRadius: 14,
          padding: "26px 30px",
          whiteSpace: "pre-line",
        }}
      >
        {texto}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "#8A97AE" }}>
        Trechos em análise destacados para o revisor · campos inferidos marcados · documento não protocolado até aprovação.
      </div>
    </div>
  );
}
