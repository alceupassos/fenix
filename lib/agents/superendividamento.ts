/**
 * Superendividamento — triage under Lei 14.181/2021 principles.
 * Builds preliminary creditor table + existential minimum check.
 * Does not file court plans; prepares dossiê for human/legal path.
 */

import type { AtlasDebtInput } from "./atlas";
import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type SuperInput = {
  debts: AtlasDebtInput[];
  rendaMensal: number;
  despesasEssenciais: number; // food, housing, water, energy, medicine, transport basic
  dependentes?: number;
  temProcessoCobranca?: boolean;
};

export type CredorQuadro = {
  credor: string;
  valor: number;
  natureza: "consumo" | "essencial" | "real" | "alimentar" | "outra";
  prioridadeRepactuacao: number; // 1 = first
};

export type SuperResult = AgentResultBase & {
  elegivelSinal: "provavel" | "incerto" | "improvavel";
  minimoExistencial: number;
  comprometimentoRendaPct: number;
  quadro: CredorQuadro[];
  planoPreliminar: string[];
  dossieChecklist: string[];
};

function natureza(d: AtlasDebtInput): CredorQuadro["natureza"] {
  const t = `${d.tipo ?? ""} ${d.credor} ${d.status}`.toLowerCase();
  if (/pens[aã]o|aliment/.test(t)) return "alimentar";
  if (/energia|luz|água|agua|condom|aluguel|essencial|priorit/.test(t)) return "essencial";
  if (/financiamento.*im[oó]vel|hipotec|casa pr[oó]pria/.test(t)) return "real";
  return "consumo";
}

export function runSuperendividamento(input: SuperInput): SuperResult {
  const renda = Math.max(0, input.rendaMensal);
  const essencial = Math.max(0, input.despesasEssenciais);
  const minimo = essencial; // simplified proxy for existential minimum
  const totalDivida = input.debts.reduce((s, d) => s + d.valor, 0);
  const disponivel = Math.max(0, renda - minimo);
  const comprometimento = renda > 0 ? Math.round((totalDivida / Math.max(renda, 1)) * 100) / 100 : 0;
  // rough: if monthly debt service estimate (total/24) > disponivel → over-indebted signal
  const servicoMensalEst = totalDivida / 24;
  const razao = renda > 0 ? servicoMensalEst / renda : 1;

  let elegivelSinal: SuperResult["elegivelSinal"] = "incerto";
  if (razao > 0.35 && disponivel < servicoMensalEst && totalDivida > renda * 3) {
    elegivelSinal = "provavel";
  } else if (totalDivida < renda * 1.5 || disponivel > servicoMensalEst * 1.2) {
    elegivelSinal = "improvavel";
  }

  const quadro: CredorQuadro[] = input.debts
    .map((d) => ({
      credor: d.credor,
      valor: Math.round(d.valor),
      natureza: natureza(d),
      prioridadeRepactuacao: 0,
    }))
    .sort((a, b) => {
      const order = { alimentar: 0, essencial: 1, real: 2, consumo: 3, outra: 4 };
      return order[a.natureza] - order[b.natureza] || b.valor - a.valor;
    })
    .map((c, i) => ({ ...c, prioridadeRepactuacao: i + 1 }));

  const planoPreliminar = [
    "Proteger o mínimo existencial (comida, moradia, água, luz, remédios, transporte básico).",
    "Montar quadro de credores com valores conferidos (Íris + extratos).",
    "Não priorizar credor de consumo à custa do essencial.",
    elegivelSinal === "provavel"
      ? "Avaliar repactuação / conciliação (Procon, Cejusc, Defensoria) — advogado na estratégia."
      : "Negociar individualmente com sobra real (Acordo) e contestar o que for irregular.",
    input.temProcessoCobranca
      ? "Há processo: Oficina prepara defesa; Botão Fênix antes de protocolar."
      : "Sem processo informado — manter via administrativa enquanto couber.",
  ];

  const dossieChecklist = [
    "Documentos de identidade e comprovante de residência",
    "Comprovantes de renda (3 meses)",
    "Extratos e faturas de todos os credores",
    "Lista de despesas essenciais com valores",
    "Contratos e negativações (SPC/Serasa se tiver)",
    "Citações/processos se houver",
    "Composição familiar / dependentes",
  ];

  const band: AutomationBand =
    elegivelSinal === "provavel" || input.temProcessoCobranca ? "amarela" : "verde";

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return {
    elegivelSinal,
    minimoExistencial: minimo,
    comprometimentoRendaPct: Math.round(razao * 100),
    quadro,
    planoPreliminar,
    dossieChecklist,
    band,
    confidence: input.debts.length ? 0.72 : 0.4,
    summary:
      `Triagem superendividamento (Lei 14.181/2021 — princípios): sinal ${elegivelSinal}. ` +
      `Mínimo existencial estimado ${fmt(minimo)}; serviço mensal aproximado ${fmt(Math.round(servicoMensalEst))}. ` +
      `Isto não é decisão judicial nem garantia de plano homologado.`,
    nextSteps: planoPreliminar.slice(0, 3),
    publicChannels: [
      "Procon",
      "Cejusc / centros de conciliação",
      "Defensoria Pública",
      "Consumidor.gov.br",
    ],
    audit: makeAudit("superendividamento", band, {
      notes: [
        `sinal=${elegivelSinal}`,
        `totalDivida=${totalDivida}`,
        `renda=${renda}`,
        "sem_jurisprudencia; lei citada só como referência de política pública",
      ],
      sources: ["Lei 14.181/2021 (referência)", "triagem Super v0.1", "Atlas"],
      requiresLawyerReview: true,
    }),
  };
}
