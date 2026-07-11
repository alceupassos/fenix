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
              <p style={{ color: "#657493", fontSize: 14 }}>Execute um núcleo à esquerda para ver o JSON estruturado (faixa, passos, auditoria).</p>
            )}
            {loading && <p style={{ color: "#0C6E6E", fontWeight: 700 }}>Processando…</p>}
            {out != null && (
              <pre
                style={{
                  margin: 0,
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
                {JSON.stringify(out, null, 2)}
              </pre>
            )}
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
