"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import {
  painelNav,
  painelTitulos,
  resumo,
  problemas,
  planoEtapas,
  dividas as defDividas,
  prazos as defPrazos,
  docs as defDocs,
  reclamacoes as defReclamacoes,
  type PainelTab,
  type Divida,
  type Prazo,
  type Doc,
  type Reclamacao,
} from "@/lib/data";

export default function Painel({
  nome = "Marina",
  dividas = defDividas,
  prazos = defPrazos,
  docs = defDocs,
  reclamacoes = defReclamacoes,
}: {
  nome?: string;
  dividas?: Divida[];
  prazos?: Prazo[];
  docs?: Doc[];
  reclamacoes?: Reclamacao[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<PainelTab>("visao");
  const [titulo, sub] = painelTitulos[tab];
  const NOME = nome;
  const firstName = nome.split(" ")[0];

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "stretch", background: "#F5F7FB", height: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          flex: "none",
          background: "#0C1D3E",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          padding: "22px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 10px 22px" }}>
          <Image src="/fenix-mark.png" alt="" width={30} height={28} style={{ width: 30, height: "auto" }} />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 15 }}>
            Sociedade Fênix
          </span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {painelNav.map((pn) => {
            const active = tab === pn.id;
            return (
              <button
                key={pn.id}
                onClick={() => setTab(pn.id)}
                style={{
                  font: "inherit",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  textAlign: "left",
                  background: active ? "rgba(78,205,196,.16)" : "transparent",
                  color: active ? "#7FE3DC" : "rgba(255,255,255,.72)",
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 13px",
                  transition: "all .15s",
                }}
              >
                <Icon name={pn.icon} size={17} />
                {pn.label}
                {pn.badge && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#EE6E45",
                      color: "#fff",
                      fontSize: 10.5,
                      fontWeight: 800,
                      borderRadius: 999,
                      padding: "2px 8px",
                    }}
                  >
                    {pn.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div
          style={{
            marginTop: "auto",
            background: "rgba(78,205,196,.1)",
            border: "1px solid rgba(78,205,196,.25)",
            borderRadius: 16,
            padding: 15,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#7FE3DC", marginBottom: 5 }}>
            Precisa desabafar?
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5, marginBottom: 11 }}>
            A Clara está aqui para ouvir e organizar.
          </div>
          <button
            onClick={() => router.push("/chat")}
            className="h-clara-cta"
            style={{
              font: "inherit",
              width: "100%",
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
              border: "none",
              borderRadius: 999,
              padding: 9,
              color: "#0C1D3E",
              background: "#4ECDC4",
            }}
          >
            Falar com a Clara
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0, padding: "clamp(20px, 3.4vw, 40px)", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 26 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1
              className="font-display"
              style={{ fontWeight: 800, fontSize: "clamp(24px, 3vw, 32px)", letterSpacing: "-.02em", margin: 0 }}
            >
              {titulo.replace("{nome}", firstName)}
            </h1>
            <p style={{ fontSize: 14, color: "#6B7A96", margin: "4px 0 0" }}>{sub}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                background: "#E6F7F6",
                color: "#0C6E6E",
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 999,
                padding: "8px 16px",
              }}
            >
              3 problemas mapeados
            </span>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "var(--grad-orange)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {NOME.charAt(0).toUpperCase()}
            </div>
            <LogoutButton />
          </div>
        </div>

        {tab === "visao" && <TabVisao />}
        {tab === "dividas" && <TabDividas dividas={dividas} />}
        {tab === "prazos" && <TabPrazos prazos={prazos} />}
        {tab === "cofre" && <TabCofre docs={docs} />}
        {tab === "recl" && <TabReclamacoes reclamacoes={reclamacoes} />}
      </main>
    </div>
  );
}

const cardBase: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
};

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display" style={{ fontWeight: 800, fontSize: 19, margin: "0 0 14px" }}>
      {children}
    </h3>
  );
}

function TabVisao() {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 26,
        }}
      >
        {resumo.map((rs) => (
          <div key={rs.label} style={{ ...cardBase, borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7A96", marginBottom: 8 }}>{rs.label}</div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", color: rs.color }}>
              {rs.valor}
            </div>
            <div style={{ fontSize: 11.5, color: "#8A97AE", marginTop: 4 }}>{rs.nota}</div>
          </div>
        ))}
      </div>

      <H3>Seus três problemas, organizados</H3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 14,
          marginBottom: 30,
        }}
      >
        {problemas.map((pb) => (
          <div
            key={pb.titulo}
            style={{ ...cardBase, borderLeft: `4px solid ${pb.cor}`, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 9 }}
          >
            <span
              style={{
                alignSelf: "flex-start",
                background: pb.tagBg,
                color: pb.tagColor,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              {pb.tag}
            </span>
            <strong style={{ fontSize: 15.5, lineHeight: 1.35 }}>{pb.titulo}</strong>
            <p style={{ fontSize: 13, color: "#6B7A96", margin: 0, lineHeight: 1.55, flex: 1 }}>{pb.desc}</p>
            <button
              style={{
                font: "inherit",
                alignSelf: "flex-start",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                background: "none",
                border: "none",
                color: "#0C6E6E",
                padding: 0,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {pb.acao} →
            </button>
          </div>
        ))}
      </div>

      <H3>Plano de Recomeço</H3>
      <div style={{ ...cardBase, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column" }}>
        {planoEtapas.map((pe, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "13px 0" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: pe.dotBg,
                  color: pe.dotColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <Icon name={pe.icon} size={14} strokeWidth={3} />
              </div>
              {pe.linha && <div style={{ width: 2, flex: 1, background: "rgba(19,35,63,.1)", marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: 6 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: pe.quandoColor,
                  marginBottom: 3,
                }}
              >
                {pe.quando}
              </div>
              <strong style={{ fontSize: 14.5 }}>{pe.titulo}</strong>
              <p style={{ fontSize: 13, color: "#6B7A96", margin: "3px 0 0", lineHeight: 1.5 }}>{pe.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TabDividas({ dividas }: { dividas: Divida[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {dividas.map((d) => (
        <div
          key={d.credor}
          style={{ ...cardBase, borderRadius: 18, padding: "19px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}
        >
          <div style={{ flex: "2 1 220px", minWidth: 180 }}>
            <strong style={{ fontSize: 15 }}>{d.credor}</strong>
            <div style={{ fontSize: 12.5, color: "#6B7A96", marginTop: 2 }}>{d.tipo}</div>
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 18 }}>{d.valor}</div>
            <div style={{ fontSize: 11.5, color: "#8A97AE" }}>{d.detalhe}</div>
          </div>
          <span
            style={{
              background: d.tagBg,
              color: d.tagColor,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              borderRadius: 999,
              padding: "5px 13px",
              whiteSpace: "nowrap",
            }}
          >
            {d.status}
          </span>
          <button
            className="h-btn-teal-outline"
            style={{
              font: "inherit",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              border: "1.5px solid rgba(18,165,165,.5)",
              background: "#fff",
              color: "#0C6E6E",
              borderRadius: 999,
              padding: "9px 18px",
              whiteSpace: "nowrap",
            }}
          >
            {d.acao}
          </button>
        </div>
      ))}
    </div>
  );
}

function TabPrazos({ prazos }: { prazos: Prazo[] }) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {prazos.map((pz, i) => (
          <div
            key={i}
            style={{ ...cardBase, borderRadius: 18, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                flex: "none",
                borderRadius: 16,
                background: pz.dataBg,
                color: pz.dataColor,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="font-display" style={{ fontWeight: 800, fontSize: 19, lineHeight: 1 }}>{pz.dia}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase" }}>{pz.mes}</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <strong style={{ fontSize: 15 }}>{pz.titulo}</strong>
              <div style={{ fontSize: 12.5, color: "#6B7A96", marginTop: 2 }}>{pz.desc}</div>
            </div>
            <span
              style={{
                background: pz.tagBg,
                color: pz.tagColor,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                borderRadius: 999,
                padding: "5px 13px",
              }}
            >
              {pz.chip}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          background: "#E6F7F6",
          border: "1px solid rgba(18,165,165,.3)",
          borderRadius: 16,
          padding: "15px 19px",
          fontSize: 13,
          color: "#0C6E6E",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="bell" size={16} />
        O Vigia avisa você por WhatsApp e e-mail antes de cada prazo. Nenhuma data importante passa em branco.
      </div>
    </>
  );
}

function TabCofre({ docs }: { docs: Doc[] }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 14 }}>
        {docs.map((dc) => (
          <div key={dc.nome} style={{ ...cardBase, borderRadius: 18, padding: 19, display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "#F0F4F9",
                color: "#3E4E6C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="file" size={19} />
            </div>
            <strong style={{ fontSize: 14, lineHeight: 1.35 }}>{dc.nome}</strong>
            <span
              style={{
                alignSelf: "flex-start",
                background: dc.tagBg,
                color: dc.tagColor,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                borderRadius: 999,
                padding: "4px 11px",
              }}
            >
              {dc.status}
            </span>
          </div>
        ))}
        <button
          className="h-dashed"
          style={{
            font: "inherit",
            cursor: "pointer",
            border: "2px dashed rgba(18,165,165,.4)",
            background: "rgba(18,165,165,.04)",
            borderRadius: 18,
            padding: 19,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            color: "#0C6E6E",
            fontSize: 13.5,
            fontWeight: 800,
            minHeight: 140,
          }}
        >
          <Icon name="plus" size={22} />
          Adicionar documento
        </button>
      </div>
      <div style={{ marginTop: 18, fontSize: 12.5, color: "#8A97AE", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="lock" size={14} strokeWidth={2.75} />
        Cofre criptografado. Todo acesso fica registrado — inclusive o nosso.
      </div>
    </>
  );
}

function TabReclamacoes({ reclamacoes }: { reclamacoes: Reclamacao[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {reclamacoes.map((rc) => (
        <div key={rc.protocolo} style={{ ...cardBase, borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <strong style={{ fontSize: 15.5 }}>{rc.titulo}</strong>
              <div style={{ fontSize: 12.5, color: "#6B7A96", marginTop: 2 }}>
                {rc.canal} · protocolo {rc.protocolo}
              </div>
            </div>
            <span
              style={{
                background: rc.tagBg,
                color: rc.tagColor,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                borderRadius: 999,
                padding: "5px 13px",
              }}
            >
              {rc.status}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {rc.etapas.map((et, i) => (
              <div key={i} style={{ flex: 1, minWidth: 110, display: "flex", flexDirection: "column", gap: 7, paddingRight: 10 }}>
                <div style={{ height: 5, borderRadius: 999, background: et.barra }} />
                <div style={{ fontSize: 11.5, fontWeight: 700, color: et.cor }}>{et.nome}</div>
                <div style={{ fontSize: 11, color: "#8A97AE" }}>{et.data}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
