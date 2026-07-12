"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/Icon";
import type { PonteTema } from "@/lib/agents/ponte";

type TabId = "super" | "acordo" | "defensor" | "ponte" | "escudo" | "oficina";

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "super", label: "Superendividamento", icon: "wallet" },
  { id: "acordo", label: "Acordo", icon: "bank" },
  { id: "defensor", label: "Defensor", icon: "msg" },
  { id: "ponte", label: "Ponte Governo", icon: "gov" },
  { id: "escudo", label: "Escudo", icon: "shield" },
  { id: "oficina", label: "Oficina", icon: "file" },
];

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
  borderRadius: 18,
  padding: 20,
};

export default function NucleosHub() {
  const [tab, setTab] = useState<TabId>("super");
  const [out, setOut] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Defensor form
  const [empresa, setEmpresa] = useState("FinanCred");
  const [problema, setProblema] = useState("Consignado que não reconheço, desconto em folha sem contrato.");
  // Ponte
  const [ponteTema, setPonteTema] = useState<PonteTema>("inss_beneficio");
  // Escudo
  const [contrato, setContrato] = useState("");
  // Oficina
  const [fatos, setFatos] = useState("Recebi citação de cobrança da Loja Meridiano no valor de R$ 8.300.");

  async function run(path: string, init?: RequestInit) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(path, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Erro");
      setOut(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
      setOut(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FB" }}>
      <header
        style={{
          background: "#0C1D3E",
          color: "#fff",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link href="/painel" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none" }}>
          <Image src="/fenix-mark.png" alt="" width={28} height={26} />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 15 }}>
            Núcleos Fênix
          </span>
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)", flex: 1 }}>
          Fase Salvar · agentes com faixa e auditoria
        </span>
        <Link href="/painel" style={{ color: "#7FE3DC", fontSize: 13, fontWeight: 700 }}>
          ← Voltar ao painel
        </Link>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 18px 48px" }}>
        <h1 className="font-display" style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-.02em", margin: "0 0 8px" }}>
          Central de núcleos
        </h1>
        <p style={{ color: "#54627F", margin: "0 0 20px", fontSize: 14.5, lineHeight: 1.55, maxWidth: "62ch" }}>
          Ferramentas da Fase 1 (Salvar): superendividamento, negociação, consumidor, governo, proteção e minutas.
          Medidas jurídicas só saem com o Botão Fênix.
        </p>

        <div style={{ marginBottom: 16 }}>
          <Link
            href="/nucleos/cnh"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 999,
              background: "linear-gradient(135deg,#12A5A5,#4ECDC4)",
              color: "#0A1730",
              fontWeight: 800,
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            Núcleo CNH / Trânsito →
          </Link>
          <Link
            href="/kyc"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 10,
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid rgba(19,35,63,.12)",
              background: "#fff",
              color: "#0C1D3E",
              fontWeight: 700,
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            KYC / Verificação facial
          </Link>
          <Link
            href="/cadastro"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 10,
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid rgba(19,35,63,.12)",
              background: "#fff",
              color: "#0C1D3E",
              fontWeight: 700,
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            Cadastro
          </Link>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setOut(null);
                setErr(null);
              }}
              style={{
                font: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                border: "none",
                borderRadius: 999,
                padding: "10px 16px",
                background: tab === t.id ? "#13233F" : "#fff",
                color: tab === t.id ? "#fff" : "#3E4E6C",
              }}
            >
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={card}>
            {tab === "super" && (
              <>
                <h3 className="font-display" style={{ margin: "0 0 10px", fontSize: 18 }}>Triagem Lei 14.181/2021</h3>
                <p style={{ fontSize: 13.5, color: "#54627F", lineHeight: 1.5 }}>
                  Usa as dívidas do seu painel (ou mocks). Sinal de elegibilidade é preliminar — não é decisão judicial.
                </p>
                <Btn loading={loading} onClick={() => run("/api/agents/super")}>
                  Rodar triagem Super
                </Btn>
              </>
            )}
            {tab === "acordo" && (
              <>
                <h3 className="font-display" style={{ margin: "0 0 10px", fontSize: 18 }}>Simulador Acordo</h3>
                <p style={{ fontSize: 13.5, color: "#54627F", lineHeight: 1.5 }}>
                  Propostas com base na sobra do Atlas. Descontos são hipotéticos até o credor confirmar.
                </p>
                <Btn
                  loading={loading}
                  onClick={() =>
                    run("/api/agents/acordo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ useSession: true }),
                    })
                  }
                >
                  Simular propostas
                </Btn>
              </>
            )}
            {tab === "defensor" && (
              <>
                <h3 className="font-display" style={{ margin: "0 0 10px", fontSize: 18 }}>Escada do consumidor</h3>
                <Field label="Empresa" value={empresa} onChange={setEmpresa} />
                <Field label="Problema" value={problema} onChange={setProblema} area />
                <Btn
                  loading={loading}
                  onClick={() =>
                    run("/api/agents/defensor", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ empresa, problema, jaFez: ["sac"] }),
                    })
                  }
                >
                  Montar escada
                </Btn>
              </>
            )}
            {tab === "ponte" && (
              <>
                <h3 className="font-display" style={{ margin: "0 0 10px", fontSize: 18 }}>Ponte — serviços públicos</h3>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 6 }}>
                  Tema
                </label>
                <select
                  value={ponteTema}
                  onChange={(e) => setPonteTema(e.target.value as PonteTema)}
                  style={{ width: "100%", padding: 10, borderRadius: 12, border: "1.5px solid rgba(19,35,63,.12)", marginBottom: 12, font: "inherit" }}
                >
                  <option value="receita_cpf">Receita / CPF</option>
                  <option value="pgfn_divida_ativa">PGFN / Regularize</option>
                  <option value="inss_beneficio">INSS / benefício</option>
                  <option value="mei_das">MEI / DAS</option>
                  <option value="fala_br">Fala.BR</option>
                </select>
                <Btn
                  loading={loading}
                  onClick={() =>
                    run("/api/agents/ponte", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tema: ponteTema }),
                    })
                  }
                >
                  Ver caminho oficial
                </Btn>
                <p style={{ fontSize: 12, color: "#657493", marginTop: 12 }}>Nunca pedimos senha gov.br.</p>
              </>
            )}
            {tab === "escudo" && (
              <>
                <h3 className="font-display" style={{ margin: "0 0 10px", fontSize: 18 }}>Escudo — leitura de contrato</h3>
                <Field
                  label="Cole trechos do contrato"
                  value={contrato}
                  onChange={setContrato}
                  area
                  placeholder="Ex.: juros capitalizados, seguro prestamista, confissão de dívida…"
                />
                <Btn
                  loading={loading}
                  onClick={() =>
                    run("/api/agents/escudo", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ textoContrato: contrato }),
                    })
                  }
                >
                  Analisar riscos
                </Btn>
              </>
            )}
            {tab === "oficina" && (
              <>
                <h3 className="font-display" style={{ margin: "0 0 10px", fontSize: 18 }}>Oficina — minuta</h3>
                <p style={{ fontSize: 13.5, color: "#54627F" }}>
                  Rascunho amarelo: só protocola após Botão Fênix. Sem jurisprudência inventada.
                </p>
                <Field label="Fatos" value={fatos} onChange={setFatos} area />
                <Btn
                  loading={loading}
                  onClick={() =>
                    run("/api/agents/oficina", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        kind: "contestacao_cobranca",
                        nomeUsuario: "Marina L.",
                        fatos,
                        numeroProcesso: "0045678-21.2026.8.26.0405",
                        comarca: "2ª Vara Cível de Osasco/SP",
                        valorCausa: "R$ 8.300",
                      }),
                    })
                  }
                >
                  Preparar minuta
                </Btn>
              </>
            )}
            {err && <p style={{ color: "#C2451F", fontWeight: 600, fontSize: 13 }}>{err}</p>}
          </div>

          <div style={{ ...card, minHeight: 320, overflow: "auto" }}>
            <h3 className="font-display" style={{ margin: "0 0 12px", fontSize: 18 }}>Resultado</h3>
            {!out && !loading && (
              <p style={{ color: "#657493", fontSize: 14 }}>Execute um núcleo à esquerda para ver o resultado (faixa, minuta, passos e auditoria).</p>
            )}
            {loading && <p style={{ color: "#0C6E6E", fontWeight: 700 }}>Processando…</p>}
            {out != null && <AgentResult data={out} />}
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: "#657493", marginTop: 20, lineHeight: 1.5 }}>
          Sociedade Fênix Tecnologia organiza e prepara. A advocacia parceira decide o jurídico. Canais públicos
          gratuitos são sempre indicados quando existem.
        </p>
      </div>
    </div>
  );
}

function Btn({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        font: "inherit",
        fontSize: 14,
        fontWeight: 800,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
        border: "none",
        borderRadius: 999,
        padding: "12px 20px",
        color: "#fff",
        background: "linear-gradient(135deg, #12A5A5, #0F8B8B)",
        marginTop: 8,
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  area,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  placeholder?: string;
}) {
  const style: React.CSSProperties = {
    width: "100%",
    font: "inherit",
    fontSize: 13.5,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1.5px solid rgba(19,35,63,.12)",
    marginBottom: 10,
    boxSizing: "border-box",
  };
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>{label}</label>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={placeholder} style={style} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}

// ---- Resultado estruturado (todos os núcleos compartilham AgentResultBase) ----

type Band = "verde" | "amarela" | "vermelha";

const BAND_STYLE: Record<Band, { bg: string; fg: string; label: string }> = {
  verde: { bg: "#E3F5F0", fg: "#0F7A6B", label: "faixa verde · automação ampla" },
  amarela: { bg: "#FCF1DA", fg: "#9A6B12", label: "faixa amarela · revisão do advogado" },
  vermelha: { bg: "#FBE6DE", fg: "#C2451F", label: "faixa vermelha · prioridade humana" },
};

// Rótulos PT-BR para arrays conhecidos, na ordem de exibição preferida.
const LIST_LABELS: Record<string, string> = {
  minutaSecoes: "Seções",
  checklist: "Checklist de documentos",
  camposFaltantes: "Campos faltantes",
  nextSteps: "Próximos passos",
  publicChannels: "Canais públicos",
  fontes: "Fontes",
};

// Campos com tratamento próprio — não caem no fallback genérico.
const HANDLED = new Set([
  "band",
  "titulo",
  "summary",
  "minuta",
  "audit",
  "confidence",
  "confiancaIA",
  "kind",
  ...Object.keys(LIST_LABELS),
]);

const FIELD_LABELS: Record<string, string> = {
  kind: "Tipo",
  confidence: "Confiança",
  confiancaIA: "Confiança da IA",
};

function humanize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#54627F",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  margin: "0 0 6px",
};

function List({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <p style={sectionTitle}>{label}</p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#3E4E6C", fontSize: 13.5, lineHeight: 1.55 }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function AgentResult({ data }: { data: unknown }) {
  // Formas inesperadas (não-objeto) caem direto no JSON.
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return <RawJson data={data} open />;
  }
  const o = data as Record<string, unknown>;
  const band = (["verde", "amarela", "vermelha"] as const).includes(o.band as Band) ? (o.band as Band) : null;
  const titulo = typeof o.titulo === "string" ? o.titulo : null;
  const summary = typeof o.summary === "string" ? o.summary : null;
  const minuta = typeof o.minuta === "string" ? o.minuta : null;
  const audit = o.audit && typeof o.audit === "object" ? (o.audit as Record<string, unknown>) : null;

  // Campos extras não mapeados, renderizados genericamente por tipo.
  const extras = Object.entries(o).filter(([k, v]) => !HANDLED.has(k) && v != null);

  return (
    <div>
      {band && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 11.5,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            borderRadius: 999,
            padding: "5px 12px",
            background: BAND_STYLE[band].bg,
            color: BAND_STYLE[band].fg,
          }}
        >
          {BAND_STYLE[band].label}
        </span>
      )}

      {titulo && (
        <h4 className="font-display" style={{ margin: "12px 0 4px", fontSize: 17, color: "#13233F" }}>
          {titulo}
        </h4>
      )}
      {summary && <p style={{ margin: "0 0 4px", fontSize: 13.5, color: "#54627F", lineHeight: 1.55 }}>{summary}</p>}

      {minuta && (
        <div style={{ marginTop: 14 }}>
          <p style={sectionTitle}>Minuta (rascunho)</p>
          <div
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "#26324A",
              background: "#fff",
              border: "1px solid rgba(19,35,63,.1)",
              borderRadius: 12,
              padding: 16,
              maxHeight: 420,
              overflow: "auto",
            }}
          >
            {minuta}
          </div>
        </div>
      )}

      {/* Listas conhecidas, na ordem definida em LIST_LABELS. */}
      {Object.entries(LIST_LABELS).map(([key, label]) =>
        Array.isArray(o[key]) && (o[key] as unknown[]).every((x) => typeof x === "string") ? (
          <List key={key} label={label} items={o[key] as string[]} />
        ) : null,
      )}

      {/* Campos extras genéricos (outras abas / futuros agentes). */}
      {extras.map(([key, val]) => {
        if (Array.isArray(val) && val.every((x) => typeof x === "string")) {
          return <List key={key} label={humanize(key)} items={val as string[]} />;
        }
        if (typeof val === "string" && val.includes("\n")) {
          return (
            <div key={key} style={{ marginTop: 14 }}>
              <p style={sectionTitle}>{humanize(key)}</p>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, color: "#3E4E6C", lineHeight: 1.55 }}>{val}</div>
            </div>
          );
        }
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          return (
            <p key={key} style={{ margin: "8px 0 0", fontSize: 13, color: "#3E4E6C" }}>
              <strong style={{ color: "#54627F" }}>{FIELD_LABELS[key] ?? humanize(key)}:</strong> {String(val)}
            </p>
          );
        }
        // Objetos/arrays complexos inesperados: mostrar como JSON compacto.
        return (
          <div key={key} style={{ marginTop: 14 }}>
            <p style={sectionTitle}>{humanize(key)}</p>
            <pre style={{ margin: 0, fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#3E4E6C" }}>
              {JSON.stringify(val, null, 2)}
            </pre>
          </div>
        );
      })}

      {audit && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(19,35,63,.08)", fontSize: 12, color: "#657493", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "#54627F" }}>Auditoria:</strong>{" "}
            {[typeof audit.agent === "string" ? audit.agent : null, typeof audit.version === "string" ? `v${audit.version}` : null, typeof audit.at === "string" ? fmtDate(audit.at) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {audit.requiresLawyerReview === true && (
            <p style={{ margin: "2px 0 0", color: "#9A6B12", fontWeight: 700 }}>Requer revisão de advogado antes de qualquer medida.</p>
          )}
        </div>
      )}

      <RawJson data={data} />
    </div>
  );
}

function RawJson({ data, open }: { data: unknown; open?: boolean }) {
  return (
    <details open={open} style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#657493" }}>Ver JSON completo</summary>
      <pre
        style={{
          margin: "8px 0 0",
          fontSize: 11.5,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "#3E4E6C",
          background: "#F5F7FB",
          borderRadius: 12,
          padding: 14,
          maxHeight: 520,
          overflow: "auto",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
