"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import type { AtlasResult } from "@/lib/agents/atlas";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
  borderRadius: 20,
  padding: 20,
};

/** Respects the OS "reduce motion" setting so chart animations don't fire when disabled. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function ChartTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h4
        className="font-display"
        style={{ fontWeight: 800, fontSize: 16, margin: 0, letterSpacing: "-.02em" }}
      >
        {children}
      </h4>
      {hint && (
        <p style={{ fontSize: 12, color: "#657493", margin: "4px 0 0", lineHeight: 1.45 }}>{hint}</p>
      )}
    </div>
  );
}

function SrTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="sr-only-table" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatK(n: number) {
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return `R$ ${n}`;
}

/** Gauge — % controle recuperado (indicador-mor proxy, sem promessa). */
export function ControlGauge({ value, label }: { value: number; label?: string }) {
  const reduced = usePrefersReducedMotion();
  const v = Math.max(0, Math.min(100, value));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c * 0.75; // 270° arc
  const color = v >= 60 ? "#12A5A5" : v >= 35 ? "#E0A32E" : "#E2574C";

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
      <ChartTitle hint="Estimativa com base no mapa atual — não é promessa de resultado.">
        Controle em 90 dias
      </ChartTitle>
      <svg width={160} height={130} viewBox="0 0 160 130" aria-hidden>
        <g transform="translate(80,78)">
          <circle
            r={r}
            fill="none"
            stroke="rgba(19,35,63,.08)"
            strokeWidth={12}
            strokeDasharray={`${c * 0.75} ${c}`}
            strokeLinecap="round"
            transform="rotate(135)"
          />
          <circle
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeDasharray={`${c * 0.75} ${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(135)"
            style={{ transition: reduced ? "none" : "stroke-dashoffset 1s ease-out" }}
          />
        </g>
        <text
          x="80"
          y="82"
          textAnchor="middle"
          className="font-display"
          style={{ fontWeight: 800, fontSize: 28, fill: "#13233F" }}
        >
          {v}%
        </text>
      </svg>
      <p style={{ fontSize: 12.5, color: "#54627F", textAlign: "center", margin: 0, maxWidth: 220, lineHeight: 1.45 }}>
        {label ?? "Pessoas no seu perfil costumam retomar o fôlego quando o mapa está claro e o essencial está protegido."}
      </p>
      <SrTable caption="Controle em 90 dias" headers={["Indicador", "Valor"]} rows={[["Controle estimado", `${v}%`]]} />
    </div>
  );
}

export function DebtDonut({ data }: { data: AtlasResult["porCredor"] }) {
  const reduced = usePrefersReducedMotion();
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (!data.length) {
    return (
      <div style={card}>
        <ChartTitle>Composição da dívida</ChartTitle>
        <p style={{ fontSize: 13, color: "#54627F" }}>Cadastre credores para ver o gráfico.</p>
      </div>
    );
  }

  return (
    <div style={{ ...card, position: "relative" }}>
      <ChartTitle hint="Passe o mouse (ou foque) em cada fatia para ver o valor.">
        Composição da dívida
      </ChartTitle>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
              isAnimationActive={!reduced}
              animationDuration={reduced ? 0 : 800}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
                String(name ?? ""),
              ]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(19,35,63,.1)",
                fontSize: 12.5,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div
        className="font-display"
        style={{
          position: "absolute",
          left: "50%",
          top: "52%",
          transform: "translate(-50%, -20%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#657493" }}>Total</div>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#13233F" }}>{formatK(total)}</div>
      </div>
      <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "8px 14px" }}>
        {data.map((d) => (
          <li key={d.name} style={{ fontSize: 11.5, color: "#556482", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: d.fill, flex: "none" }} />
            {d.name}
          </li>
        ))}
      </ul>
      <SrTable
        caption="Composição da dívida por credor"
        headers={["Credor", "Valor"]}
        rows={data.map((d) => [d.name, d.value])}
      />
    </div>
  );
}

export function StrategyBars({ data }: { data: AtlasResult["estrategia"] }) {
  const reduced = usePrefersReducedMotion();
  if (!data.length) {
    return (
      <div style={card}>
        <ChartTitle>Estratégia por tipo</ChartTitle>
        <p style={{ fontSize: 13, color: "#54627F" }}>Sem dados de estratégia ainda.</p>
      </div>
    );
  }

  return (
    <div style={{ ...card, position: "relative" }}>
      <ChartTitle hint="Negociável × Contestável × Prioritária × Em juízo.">
        Estratégia por tipo
      </ChartTitle>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,35,63,.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#54627F" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => formatK(Number(v))}
              tick={{ fontSize: 11, fill: "#54627F" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value) =>
                Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
              }
              contentStyle={{ borderRadius: 12, border: "1px solid rgba(19,35,63,.1)", fontSize: 12.5 }}
            />
            <Bar dataKey="value" radius={[10, 10, 4, 4]} isAnimationActive={!reduced} animationDuration={reduced ? 0 : 900}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption="Estratégia por tipo de dívida"
        headers={["Tipo", "Valor"]}
        rows={data.map((d) => [d.name, d.value])}
      />
    </div>
  );
}

export function CashflowArea({ data }: { data: AtlasResult["fluxo"] }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div style={{ ...card, position: "relative" }}>
      <ChartTitle hint="Renda × despesas essenciais. A área entre as linhas é a sobra.">
        Fluxo e mínimo existencial
      </ChartTitle>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fxRenda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#12A5A5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#12A5A5" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fxEss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EE6E45" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#EE6E45" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(19,35,63,.06)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#54627F" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => formatK(Number(v))}
              tick={{ fontSize: 11, fill: "#54627F" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
                name === "renda" ? "Renda" : name === "essencial" ? "Essencial" : "Sobra",
              ]}
              contentStyle={{ borderRadius: 12, border: "1px solid rgba(19,35,63,.1)", fontSize: 12.5 }}
            />
            <Legend
              formatter={(v) => (v === "renda" ? "Renda" : v === "essencial" ? "Essencial" : "Sobra")}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Area type="monotone" dataKey="renda" stroke="#12A5A5" fill="url(#fxRenda)" strokeWidth={2} isAnimationActive={!reduced} animationDuration={reduced ? 0 : 900} />
            <Area type="monotone" dataKey="essencial" stroke="#EE6E45" fill="url(#fxEss)" strokeWidth={2} isAnimationActive={!reduced} animationDuration={reduced ? 0 : 900} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption="Fluxo de caixa e mínimo existencial"
        headers={["Mês", "Renda", "Essencial", "Sobra"]}
        rows={data.map((d) => [d.mes, d.renda, d.essencial, d.sobra])}
      />
    </div>
  );
}

export function RecomecoTimeline({ steps }: { steps: AtlasResult["mapaRecomeco"] }) {
  const colors = ["#E2574C", "#D98324", "#12A5A5", "#2B4B8F"];
  const bgs = ["#FDEDE7", "#FFF3E6", "#E6F7F6", "#EAF0F9"];

  return (
    <div style={card}>
      <ChartTitle hint="Hoje · esta semana · este mês · depois da estabilização.">
        Mapa de Recomeço
      </ChartTitle>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
        {steps.map((s, i) => (
          <li key={s.quando} style={{ display: "flex", gap: 14, padding: "10px 0" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: bgs[i % bgs.length],
                  color: colors[i % colors.length],
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, flex: 1, background: "rgba(19,35,63,.1)", marginTop: 4, minHeight: 18 }} />
              )}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: colors[i % colors.length],
                  marginBottom: 2,
                }}
              >
                {s.quando}
              </div>
              <strong style={{ fontSize: 14 }}>{s.titulo}</strong>
              <p style={{ fontSize: 13, color: "#54627F", margin: "3px 0 0", lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full Atlas chart grid for the painel visão tab. */
export function AtlasDashboard({ atlas }: { atlas: AtlasResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <DebtDonut data={atlas.porCredor} />
        <StrategyBars data={atlas.estrategia} />
        <ControlGauge value={atlas.controle90d} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        <CashflowArea data={atlas.fluxo} />
        <RecomecoTimeline steps={atlas.mapaRecomeco} />
      </div>
      <p style={{ fontSize: 12, color: "#657493", margin: 0, lineHeight: 1.5 }}>
        Atlas v{atlas.audit.version} · faixa {atlas.band} · confianca {(atlas.confidence * 100).toFixed(0)}% ·{" "}
        {atlas.audit.requiresLawyerReview
          ? "Medidas jurídicas exigem revisão do advogado."
          : "Automação ampla (faixa verde) nesta leitura."}
      </p>
    </div>
  );
}
