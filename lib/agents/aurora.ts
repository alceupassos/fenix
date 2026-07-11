/**
 * Aurora — longitudinal follow-up / recovery score narrative.
 * Tracks progress toward the north-star metric (control in 90 days) without promising outcomes.
 */

import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type AuroraEvent = {
  data: string; // ISO or display
  tipo: "marco" | "divida" | "prazo" | "reclamacao" | "documento" | "advogado";
  titulo: string;
  impacto: number; // -10..+10 on perceived control
};

export type AuroraInput = {
  controleAtual: number; // 0-100 from Atlas
  eventos?: AuroraEvent[];
  diasDesdeInicio?: number;
};

export type AuroraResult = AgentResultBase & {
  controleAtual: number;
  controleProjetado90d: number;
  narrativa: string;
  marcos: { quando: string; titulo: string; feito: boolean }[];
  recomendacaoSemana: string[];
};

export function runAurora(input: AuroraInput): AuroraResult {
  const base = Math.max(0, Math.min(100, input.controleAtual));
  const eventos = input.eventos ?? [];
  const delta = eventos.reduce((s, e) => s + e.impacto, 0);
  const dias = input.diasDesdeInicio ?? 14;

  // Project softly — never claim certainty
  let projetado = base + delta * 0.8 + Math.min(15, dias * 0.15);
  projetado = Math.max(5, Math.min(92, Math.round(projetado)));

  const marcos = [
    { quando: "Semana 1", titulo: "Mapa de dívidas e prazos organizado", feito: base >= 30 },
    { quando: "Semana 2–4", titulo: "Essencial protegido e 1ª negociação/contestação em curso", feito: base >= 45 },
    { quando: "Dia 60", titulo: "Prazos críticos sob controle do Vigia", feito: base >= 55 },
    { quando: "Dia 90", titulo: "Sensação de controle recuperada (meta norte — sem promessa)", feito: base >= 65 },
  ];

  const band: AutomationBand = base < 30 ? "amarela" : "verde";

  const narrativa =
    base < 35
      ? `Você está no começo da organização (${base}% de controle estimado). Isso é normal — o primeiro ganho é enxergar o mapa. ` +
        `Projeção cuidadosa em 90 dias: cerca de ${projetado}% se mantiver os próximos passos (estimativa, não garantia).`
      : base < 60
        ? `Há progresso: controle estimado em ${base}%. A Aurora projeta até ~${projetado}% em 90 dias se prazos e essencial forem protegidos. ` +
          `Nada disso promete resultado judicial ou “nome limpo” automático.`
        : `Você já recuperou bastante fôlego (${base}%). Mantenha o Vigia ativo e evite novas dívidas por impulso. ` +
          `Projeção ~${projetado}% — continue no ritmo, sem pressão artificial.`;

  const recomendacaoSemana = [
    base < 40 ? "Complete documentos faltantes no cofre (Íris)." : "Revise propostas do Acordo com sobra real.",
    "Confira prazos do Vigia esta semana.",
    "Se houver peça jurídica, aguarde o Botão Fênix antes de qualquer protocolo.",
  ];

  return {
    controleAtual: base,
    controleProjetado90d: projetado,
    narrativa,
    marcos,
    recomendacaoSemana,
    band,
    confidence: 0.7,
    summary: narrativa,
    nextSteps: recomendacaoSemana,
    publicChannels: ["Painel Fênix", "Canais públicos já indicados no seu mapa"],
    audit: makeAudit("aurora", band, {
      notes: [`controle=${base}`, `projetado=${projetado}`, "sem_promessa_resultado"],
      sources: ["Aurora v0.1", "indicador-mor §18 projetofenix.md"],
    }),
  };
}
