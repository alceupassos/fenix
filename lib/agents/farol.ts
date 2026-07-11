/**
 * Farol — urgency / risk triage (deterministic rules first).
 * Detects: deadline pressure, blocked money, eviction/repossession, violence, etc.
 * Faixa vermelha → human queue; amarela → IA prepares + lawyer; verde → guided self-serve.
 */

import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type FarolSignal =
  | "prazo_curto"
  | "citacao_mandado"
  | "bloqueio_salario"
  | "risco_bem"
  | "corte_essencial"
  | "familia_grave"
  | "risco_vida"
  | "desconhecido";

export type FarolInput = {
  /** Indices matching urgLabels in lib/data, or free text. */
  selectedLabels?: string[];
  freeText?: string;
};

export type FarolResult = AgentResultBase & {
  signals: FarolSignal[];
  priorityScore: number; // 0–100
  humanQueue: boolean;
  recommendedAgent: "clara" | "oficina" | "farol_humano" | "atlas" | "ponte";
};

const LABEL_TO_SIGNAL: Record<string, FarolSignal> = {
  "Existe prazo para hoje ou os próximos dias": "prazo_curto",
  "Recebi oficial de justiça, mandado ou citação": "citacao_mandado",
  "Minha conta ou meu salário foi bloqueado": "bloqueio_salario",
  "Risco de despejo, busca e apreensão ou leilão": "risco_bem",
  "Risco de corte de água ou energia": "corte_essencial",
  "Pensão, guarda ou conflito familiar grave": "familia_grave",
  "Risco à saúde, violência ou prisão": "risco_vida",
};

const TEXT_PATTERNS: { re: RegExp; signal: FarolSignal; weight: number }[] = [
  { re: /\b(prazo|hoje|amanhã|amanha|até dia|ate dia|fatal)\b/i, signal: "prazo_curto", weight: 25 },
  { re: /\b(cita[cç][aã]o|oficial de justi[cç]a|mandado|intim[aã][cç][aã]o|f[oó]rum)\b/i, signal: "citacao_mandado", weight: 35 },
  { re: /\b(bloquead[oa]|penhora|sisbajud|sal[aá]rio retid|conta bloquead)\b/i, signal: "bloqueio_salario", weight: 40 },
  { re: /\b(despejo|busca e apreens[aã]o|leil[aã]o|tomar (meu|o) carro|perder (a )?casa)\b/i, signal: "risco_bem", weight: 40 },
  { re: /\b(corte de (água|agua|luz|energia)|sem luz|sem [aá]gua)\b/i, signal: "corte_essencial", weight: 30 },
  { re: /\b(pens[aã]o|guarda|viol[eê]ncia dom[eé]stica|amea[cç]a)\b/i, signal: "familia_grave", weight: 35 },
  { re: /\b(viol[eê]ncia|pris[aã]o|ameaça de morte|suicid|fome|rem[eé]dio)\b/i, signal: "risco_vida", weight: 50 },
];

const SIGNAL_WEIGHT: Record<FarolSignal, number> = {
  prazo_curto: 25,
  citacao_mandado: 35,
  bloqueio_salario: 40,
  risco_bem: 40,
  corte_essencial: 30,
  familia_grave: 35,
  risco_vida: 50,
  desconhecido: 10,
};

function bandFromScore(score: number, signals: FarolSignal[]): AutomationBand {
  if (signals.includes("risco_vida") || score >= 70) return "vermelha";
  if (score >= 35) return "amarela";
  return "verde";
}

function nextStepsFor(signals: FarolSignal[], band: AutomationBand): string[] {
  const steps: string[] = [];
  if (signals.includes("risco_vida")) {
    steps.push("Se houver risco à vida ou violência agora, ligue 190 (polícia) ou 188 (CVV).");
  }
  if (signals.includes("citacao_mandado") || signals.includes("prazo_curto")) {
    steps.push("Fotografe a citação/carta com a data visível e envie no chat — a Íris extrai o prazo.");
    steps.push("Nada de contestar sozinho no fórum sem revisão: a Oficina prepara, o advogado aprova (Botão Fênix).");
  }
  if (signals.includes("bloqueio_salario")) {
    steps.push("Junte extratos que mostrem a origem salarial do valor bloqueado (verba alimentar).");
    steps.push("Canal público: Defensoria Pública se não puder pagar advogado particular.");
  }
  if (signals.includes("corte_essencial")) {
    steps.push("Priorize água/luz (essenciais) antes de credores não prioritários.");
  }
  if (signals.includes("risco_bem")) {
    steps.push("Guarde o aviso de despejo/apreensão e anote a data de recebimento.");
  }
  if (band === "vermelha") {
    steps.push("Sua fila humana foi acionada — um atendente entra na conversa o quanto antes.");
  } else if (steps.length === 0) {
    steps.push("Conte o que está acontecendo com suas palavras para a Clara organizar o Mapa de Recomeço.");
  }
  return steps;
}

function publicChannels(signals: FarolSignal[]): string[] {
  const ch = new Set<string>();
  if (signals.includes("bloqueio_salario") || signals.includes("citacao_mandado")) {
    ch.add("Defensoria Pública (gratuita, se elegível)");
  }
  if (signals.includes("corte_essencial")) {
    ch.add("Procon / ouvidoria da concessionária");
  }
  if (signals.includes("familia_grave") || signals.includes("risco_vida")) {
    ch.add("190 Polícia · 188 CVV · Delegacia da Mulher quando couber");
  }
  ch.add("Consumidor.gov.br (reclamações administrativas gratuitas)");
  return [...ch];
}

function recommendedAgent(signals: FarolSignal[], band: AutomationBand): FarolResult["recommendedAgent"] {
  if (band === "vermelha" || signals.includes("risco_vida")) return "farol_humano";
  if (signals.includes("citacao_mandado") || signals.includes("prazo_curto")) return "oficina";
  if (signals.includes("bloqueio_salario")) return "oficina";
  return "clara";
}

/**
 * Pure deterministic triage — no LLM, no invented law.
 * Safe to call from client or server.
 */
export function runFarol(input: FarolInput): FarolResult {
  const signals = new Set<FarolSignal>();
  let score = 0;

  for (const label of input.selectedLabels ?? []) {
    const sig = LABEL_TO_SIGNAL[label];
    if (sig) {
      signals.add(sig);
      score += SIGNAL_WEIGHT[sig];
    }
  }

  const text = (input.freeText ?? "").trim();
  if (text) {
    for (const { re, signal, weight } of TEXT_PATTERNS) {
      if (re.test(text) && !signals.has(signal)) {
        signals.add(signal);
        score += weight;
      }
    }
  }

  if (signals.size === 0) {
    signals.add("desconhecido");
    score = 10;
  }

  score = Math.min(100, score);
  const signalList = [...signals];
  const band = bandFromScore(score, signalList);
  const humanQueue = band === "vermelha" || signalList.includes("risco_vida") || signalList.includes("citacao_mandado");
  const nextSteps = nextStepsFor(signalList, band);
  const channels = publicChannels(signalList);
  const agent = recommendedAgent(signalList, band);

  const summary =
    band === "vermelha"
      ? "Situação prioritária: há risco alto ou prazo crítico. Encaminhamos para atendimento humano e preparação com revisão do advogado."
      : band === "amarela"
        ? "Há sinais de urgência moderada. Vamos organizar documentos e próximos passos; medidas jurídicas passam pelo advogado."
        : "Sem sinal crítico imediato. A Clara pode montar seu Mapa de Recomeço com calma.";

  return {
    signals: signalList,
    priorityScore: score,
    humanQueue,
    recommendedAgent: agent,
    band,
    confidence: signals.has("desconhecido") && signalList.length === 1 ? 0.4 : 0.85,
    summary,
    nextSteps,
    publicChannels: channels,
    audit: makeAudit("farol", band, {
      notes: [`score=${score}`, `signals=${signalList.join(",")}`, humanQueue ? "fila_humana" : "self_serve"],
      sources: ["regras determinísticas Farol v0.1", "projetofenix.md §6 Farol"],
      requiresLawyerReview: band !== "verde",
    }),
  };
}
