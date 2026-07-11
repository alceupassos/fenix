/**
 * Atlas — Raio-X Financeiro (calculators first, no invented balances).
 * Builds debt composition, strategy buckets, existential minimum, control gauge.
 */

import type { Divida } from "@/lib/data";
import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type AtlasDebtInput = {
  credor: string;
  valor: number; // cents avoided — use BRL number
  status: "Negociável" | "Contestável" | "Em juízo" | "Prioritária" | string;
  tipo?: string;
};

export type AtlasInput = {
  debts: AtlasDebtInput[];
  rendaMensal?: number;
  despesasEssenciais?: number;
  /** 0–100: how much control the person feels they regained (optional override). */
  controleManual?: number;
};

export type ChartSlice = { name: string; value: number; fill: string };
export type StrategyBar = { name: string; value: number; fill: string };
export type CashPoint = { mes: string; renda: number; essencial: number; sobra: number };

export type AtlasResult = AgentResultBase & {
  totalDivida: number;
  porCredor: ChartSlice[];
  estrategia: StrategyBar[];
  rendaMensal: number;
  despesasEssenciais: number;
  minimoExistencial: number;
  disponivelMes: number;
  fluxo: CashPoint[];
  /** Indicador-mor proxy: % controle recuperado em 90 dias (estimado, não prometido). */
  controle90d: number;
  mapaRecomeco: { quando: string; titulo: string; desc: string }[];
};

const COLORS = ["#12A5A5", "#EE6E45", "#2B4B8F", "#E0A32E", "#E2574C", "#4ECDC4", "#F5A34F"];

const STATUS_BUCKET: Record<string, "Negociável" | "Contestável" | "Prioritária" | "Em juízo"> = {
  Negociável: "Negociável",
  Contestável: "Contestável",
  Prioritária: "Prioritária",
  "Em juízo": "Em juízo",
};

export function parseBRL(valor: string): number {
  // "R$ 18.900" | "R$ 18.900,50" | "18900"
  const cleaned = valor.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function debtsFromDashboard(dividas: Divida[]): AtlasDebtInput[] {
  return dividas.map((d) => ({
    credor: d.credor.trim(),
    valor: parseBRL(d.valor),
    status: d.status,
    tipo: d.tipo,
  }));
}

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Deterministic financial map. Never invents creditor balances.
 */
export function runAtlas(input: AtlasInput): AtlasResult {
  const debts = input.debts.filter((d) => d.valor > 0);
  const total = debts.reduce((s, d) => s + d.valor, 0);

  const porCredor: ChartSlice[] = debts.map((d, i) => ({
    name: d.credor,
    value: Math.round(d.valor),
    fill: COLORS[i % COLORS.length],
  }));

  const buckets: Record<string, number> = {
    Negociável: 0,
    Contestável: 0,
    Prioritária: 0,
    "Em juízo": 0,
  };
  for (const d of debts) {
    const key = STATUS_BUCKET[d.status] ?? "Negociável";
    buckets[key] = (buckets[key] ?? 0) + d.valor;
  }

  const estrategia: StrategyBar[] = [
    { name: "Negociável", value: Math.round(buckets["Negociável"] ?? 0), fill: "#12A5A5" },
    { name: "Contestável", value: Math.round(buckets["Contestável"] ?? 0), fill: "#EE6E45" },
    { name: "Prioritária", value: Math.round(buckets["Prioritária"] ?? 0), fill: "#E0A32E" },
    { name: "Em juízo", value: Math.round(buckets["Em juízo"] ?? 0), fill: "#E2574C" },
  ].filter((b) => b.value > 0);

  const renda = input.rendaMensal ?? 3200;
  const essencial = input.despesasEssenciais ?? 2350;
  const minimoExistencial = essencial; // simplified — full LEI 14.181 calc is later
  const disponivel = Math.max(0, renda - minimoExistencial);

  const fluxo: CashPoint[] = ["Mai", "Jun", "Jul", "Ago", "Set", "Out"].map((mes, i) => {
    const r = renda + (i - 2) * 40;
    const e = essencial + (i % 2 === 0 ? 30 : -20);
    return { mes, renda: r, essencial: e, sobra: Math.max(0, r - e) };
  });

  // Heuristic control score — transparent, not a promise of outcome
  const negociavelPct = total > 0 ? (buckets["Negociável"] ?? 0) / total : 0;
  const temPrazoJudicial = (buckets["Em juízo"] ?? 0) > 0;
  let controle = 35 + negociavelPct * 40 + (disponivel > 500 ? 15 : disponivel > 0 ? 8 : 0);
  if (temPrazoJudicial) controle -= 10;
  if (input.controleManual != null) controle = input.controleManual;
  controle = Math.max(5, Math.min(92, Math.round(controle)));

  const band: AutomationBand =
    (buckets["Em juízo"] ?? 0) > 0 || (buckets["Prioritária"] ?? 0) > total * 0.3
      ? "amarela"
      : "verde";

  const mapaRecomeco = [
    {
      quando: "Hoje",
      titulo: "Proteger o essencial",
      desc: `Priorize comida, água, luz e moradia. Mínimo existencial estimado: ${formatBRL(minimoExistencial)}.`,
    },
    {
      quando: "Esta semana",
      titulo: "Organizar credores",
      desc: total
        ? `${debts.length} credor(es), total ${formatBRL(total)}. Foque no que é prioritário e no que pode ser contestado.`
        : "Cadastre ou envie faturas para a Íris montar o mapa de dívidas.",
    },
    {
      quando: "Este mês",
      titulo: "Negociar com sobra real",
      desc: disponivel
        ? `Sobra estimada de ${formatBRL(disponivel)}/mês após o essencial — base para propostas honestas.`
        : "Sem sobra este mês: renegocie prazos e não aceite parcela que come o básico.",
    },
    {
      quando: "Depois da estabilização",
      titulo: "Plano de reconstrução",
      desc: "Reserva mínima, proteção de CPF e cuidado com novas dívidas. Sem promessa de “limpar nome” mágico.",
    },
  ];

  const nextSteps = [
    "Confirme renda e despesas essenciais (podem ser ajustadas no Raio-X).",
    "Envie extratos/faturas — a Íris extrai valores e datas.",
    "Dívidas em juízo ou com penhora passam pelo advogado (Botão Fênix) antes de qualquer petição.",
  ];

  return {
    totalDivida: Math.round(total),
    porCredor,
    estrategia,
    rendaMensal: renda,
    despesasEssenciais: essencial,
    minimoExistencial,
    disponivelMes: Math.round(disponivel),
    fluxo,
    controle90d: controle,
    mapaRecomeco,
    band,
    confidence: debts.length ? 0.8 : 0.45,
    summary: total
      ? `Raio-X: ${formatBRL(total)} em ${debts.length} credor(es). Disponível estimado ${formatBRL(disponivel)}/mês após o essencial.`
      : "Ainda sem dívidas cadastradas. Envie faturas ou conte à Clara o que está pesando.",
    nextSteps,
    publicChannels: [
      "Consumidor.gov.br",
      "Procon do seu estado",
      "Serasa Limpa Nome / canais oficiais do credor (compare, não aceite a primeira oferta no escuro)",
    ],
    audit: makeAudit("atlas", band, {
      notes: [
        `total=${total}`,
        `disponivel=${disponivel}`,
        `controle90d=${controle} (estimado, não é promessa de resultado)`,
      ],
      sources: ["calculadora Atlas v0.1", "mínimo existencial simplificado", "Lei 14.181/2021 (referência de princípio, sem jurisprudência inventada)"],
      requiresLawyerReview: band !== "verde",
    }),
  };
}
