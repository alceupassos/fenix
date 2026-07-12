"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import {
  CNH_SERVICE_OPTIONS,
  type CnhResult,
  type CnhServiceKind,
  type MultaRecursoEtapa,
} from "@/lib/agents/cnh";

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
  borderRadius: 18,
  padding: 20,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  font: "inherit",
  fontSize: 13.5,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1.5px solid rgba(19,35,63,.12)",
  marginBottom: 10,
  boxSizing: "border-box",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#54627F",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  margin: "0 0 6px",
};

type Band = "verde" | "amarela" | "vermelha";

const BAND_STYLE: Record<Band, { bg: string; fg: string; label: string }> = {
  verde: { bg: "#E3F5F0", fg: "#0F7A6B", label: "faixa verde · automação ampla" },
  amarela: { bg: "#FCF1DA", fg: "#9A6B12", label: "faixa amarela · revisão do advogado" },
  vermelha: { bg: "#FBE6DE", fg: "#C2451F", label: "faixa vermelha · prioridade humana" },
};

function needsMultaForm(s: CnhServiceKind) {
  return s === "recurso_multa";
}

function needsPontos(s: CnhServiceKind) {
  return s === "consulta_pontos" || s === "suspensao_cassacao";
}

function needsCategoria(s: CnhServiceKind) {
  return s === "renovacao" || s === "mudanca_categoria" || s === "primeira_habilitacao";
}

function needsRelato(s: CnhServiceKind) {
  return (
    s === "perda_roubo_extravio" ||
    s === "recurso_multa" ||
    s === "suspensao_cassacao" ||
    s === "consulta_pontos"
  );
}

export default function CnhNucleo() {
  const [service, setService] = useState<CnhServiceKind>("perda_roubo_extravio");
  const [uf, setUf] = useState("SP");
  const [relato, setRelato] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pontos, setPontos] = useState("");
  const [autoInfracao, setAutoInfracao] = useState("");
  const [dataNotificacao, setDataNotificacao] = useState("");
  const [etapa, setEtapa] = useState<MultaRecursoEtapa>("defesa_previa");
  const [orgao, setOrgao] = useState("");

  const [out, setOut] = useState<CnhResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const serviceLabel = useMemo(
    () => CNH_SERVICE_OPTIONS.find((o) => o.value === service)?.label ?? service,
    [service],
  );

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        service,
        uf,
        relato: relato.trim() || undefined,
        categoria: categoria.trim() || undefined,
      };
      if (needsPontos(service) && pontos.trim() !== "") {
        const n = Number(pontos.replace(",", "."));
        if (Number.isFinite(n)) body.pontos = n;
      }
      if (needsMultaForm(service)) {
        body.multa = {
          autoInfracao: autoInfracao.trim() || undefined,
          dataNotificacao: dataNotificacao.trim() || undefined,
          etapa,
          orgao: orgao.trim() || undefined,
        };
      }

      const res = await fetch("/api/agents/cnh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Erro ao consultar CNH");
      setOut(data as CnhResult);
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
        <Link
          href="/nucleos"
          style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none" }}
        >
          <Image src="/fenix-mark.png" alt="" width={28} height={26} />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 15 }}>
            Núcleo CNH / Trânsito
          </span>
        </Link>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.55)", flex: 1 }}>
          DETRAN · gov.br · CDT · recursos com Botão Fênix
        </span>
        <Link href="/nucleos" style={{ color: "#7FE3DC", fontSize: 13, fontWeight: 700 }}>
          ← Voltar aos núcleos
        </Link>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 18px 48px" }}>
        <h1
          className="font-display"
          style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-.02em", margin: "0 0 8px" }}
        >
          CNH e trânsito
        </h1>
        <p style={{ color: "#54627F", margin: "0 0 20px", fontSize: 14.5, lineHeight: 1.55, maxWidth: "68ch" }}>
          Orientação prática para 2ª via, renovação, CNH Digital, pontos, multas, suspensão e CRLV/IPVA.
          Canais públicos gratuitos (DETRAN da UF, gov.br, app CDT) são sempre indicados. Peças de recurso
          são rascunho — só seguem após o advogado e o Botão Fênix.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div style={card}>
            <h3 className="font-display" style={{ margin: "0 0 12px", fontSize: 18 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icon name="id" size={18} />
                Serviço
              </span>
            </h3>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
              O que você precisa?
            </label>
            <select
              value={service}
              onChange={(e) => {
                setService(e.target.value as CnhServiceKind);
                setOut(null);
                setErr(null);
              }}
              style={fieldStyle}
            >
              {CNH_SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
              UF da habilitação / DETRAN
            </label>
            <select value={uf} onChange={(e) => setUf(e.target.value)} style={fieldStyle}>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {needsCategoria(service) && (
              <>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Categoria (opcional)
                </label>
                <input
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex.: B, AB, B→C"
                  style={fieldStyle}
                />
              </>
            )}

            {needsPontos(service) && (
              <>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Pontos no extrato (opcional)
                </label>
                <input
                  value={pontos}
                  onChange={(e) => setPontos(e.target.value)}
                  placeholder="Ex.: 18"
                  inputMode="numeric"
                  style={fieldStyle}
                />
              </>
            )}

            {needsMultaForm(service) && (
              <div
                style={{
                  marginTop: 4,
                  marginBottom: 8,
                  padding: 14,
                  borderRadius: 14,
                  background: "#F5F7FB",
                  border: "1px solid rgba(19,35,63,.06)",
                }}
              >
                <p style={{ ...sectionTitle, marginBottom: 10 }}>Dados da multa / recurso</p>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Etapa
                </label>
                <select
                  value={etapa}
                  onChange={(e) => setEtapa(e.target.value as MultaRecursoEtapa)}
                  style={fieldStyle}
                >
                  <option value="defesa_previa">Defesa prévia</option>
                  <option value="jari">JARI</option>
                  <option value="cetran">CETRAN</option>
                </select>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Nº do auto de infração
                </label>
                <input
                  value={autoInfracao}
                  onChange={(e) => setAutoInfracao(e.target.value)}
                  placeholder="Ex.: A123456789"
                  style={fieldStyle}
                />
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Data da notificação
                </label>
                <input
                  value={dataNotificacao}
                  onChange={(e) => setDataNotificacao(e.target.value)}
                  placeholder="Ex.: 10/03/2026"
                  style={fieldStyle}
                />
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Órgão autuador
                </label>
                <input
                  value={orgao}
                  onChange={(e) => setOrgao(e.target.value)}
                  placeholder="Ex.: DETRAN-SP / CET / PRF"
                  style={fieldStyle}
                />
              </div>
            )}

            {needsRelato(service) && (
              <>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#54627F", display: "block", marginBottom: 4 }}>
                  Relato (opcional, ajuda a personalizar)
                </label>
                <textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value)}
                  rows={4}
                  placeholder={
                    service === "recurso_multa"
                      ? "Descreva os fatos e por que contesta a autuação…"
                      : "Conte o que aconteceu…"
                  }
                  style={{ ...fieldStyle, resize: "vertical" }}
                />
              </>
            )}

            <button
              type="button"
              onClick={run}
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
                marginTop: 4,
              }}
            >
              {loading ? "Processando…" : `Montar orientação · ${serviceLabel}`}
            </button>

            {err && (
              <p style={{ color: "#C2451F", fontWeight: 600, fontSize: 13, marginTop: 12 }}>{err}</p>
            )}

            <p style={{ fontSize: 12, color: "#657493", marginTop: 14, lineHeight: 1.5 }}>
              A Fênix não substitui o DETRAN nem o advogado. Nunca pedimos senha gov.br. Menções ao CTB
              devem ser confirmadas no texto vigente.
            </p>
          </div>

          <div style={{ ...card, minHeight: 360, overflow: "auto" }}>
            <h3 className="font-display" style={{ margin: "0 0 12px", fontSize: 18 }}>
              Resultado
            </h3>
            {!out && !loading && (
              <p style={{ color: "#657493", fontSize: 14, lineHeight: 1.55 }}>
                Escolha o serviço e a UF à esquerda. Você verá checklist, canais públicos, prazos sugeridos
                e, no recurso de multa, a minuta com aviso de Botão Fênix.
              </p>
            )}
            {loading && <p style={{ color: "#0C6E6E", fontWeight: 700 }}>Processando…</p>}
            {out && <CnhResultView data={out} />}
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: "#657493", marginTop: 20, lineHeight: 1.5 }}>
          Sociedade Fênix Tecnologia organiza e prepara. A advocacia parceira decide o jurídico. Para SP, o
          portal{" "}
          <a href="https://www.detran.sp.gov.br" style={{ color: "#0F8B8B", fontWeight: 700 }} target="_blank" rel="noreferrer">
            detran.sp.gov.br
          </a>{" "}
          é um exemplo de canal estadual — cada UF tem o seu DETRAN oficial.
        </p>
      </div>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
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

function CnhResultView({ data }: { data: CnhResult }) {
  const band = data.band;

  return (
    <div>
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

      <p style={{ margin: "12px 0 4px", fontSize: 13.5, color: "#54627F", lineHeight: 1.55 }}>
        {data.summary}
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 12.5, color: "#657493" }}>
        Confiança: {Math.round(data.confidence * 100)}% · serviço: {data.service}
      </p>

      <ListBlock label="Checklist" items={data.checklist} />
      <ListBlock label="Orientações" items={data.orientacoes} />
      <ListBlock label="Documentos necessários" items={data.documentosNecessarios} />
      <ListBlock label="Próximos passos" items={data.nextSteps} />

      {data.prazosSugeridos?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={sectionTitle}>Prazos sugeridos</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#3E4E6C", fontSize: 13.5, lineHeight: 1.55 }}>
            {data.prazosSugeridos.map((p, i) => (
              <li key={i}>
                <strong>{p.label}</strong>
                {p.diasUteis != null ? ` · ~${p.diasUteis} dia(s) úteis (referência)` : ""}
                {" — "}
                {p.nota}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.publicChannels?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={sectionTitle}>Canais públicos (gratuitos)</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#3E4E6C", fontSize: 13.5, lineHeight: 1.55 }}>
            {data.publicChannels.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {data.detranLinks?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p style={sectionTitle}>Links oficiais</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
            {data.detranLinks.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "#0F8B8B", fontWeight: 700 }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.minutaSugerida && (
        <div style={{ marginTop: 16 }}>
          <p style={sectionTitle}>Minuta sugerida (rascunho)</p>
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#FCF1DA",
              color: "#9A6B12",
              fontSize: 12.5,
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            ⚠️ REVISÃO OBRIGATÓRIA DO ADVOGADO — Botão Fênix. Não protocole este texto sem aprovação
            profissional (OAB). A IA prepara; o advogado decide.
            {data.minutaSugerida.requiresFenixButton ? " · requiresFenixButton=true" : ""}
          </div>
          <h4 className="font-display" style={{ margin: "0 0 8px", fontSize: 15, color: "#13233F" }}>
            {data.minutaSugerida.titulo}
          </h4>
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
            {data.minutaSugerida.corpo}
          </div>
        </div>
      )}

      {data.audit && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid rgba(19,35,63,.08)",
            fontSize: 12,
            color: "#657493",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong style={{ color: "#54627F" }}>Auditoria:</strong> {data.audit.agent} · v
            {data.audit.version}
            {data.audit.requiresLawyerReview && (
              <span style={{ color: "#9A6B12", fontWeight: 700 }}>
                {" "}
                · requer revisão de advogado
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
