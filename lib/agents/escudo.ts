/**
 * Escudo Fênix — prevention: contract red flags, CPF monitoring checklist.
 */

import { type AgentResultBase, makeAudit } from "./types";

export type EscudoInput = {
  textoContrato?: string;
  tipo?: "emprestimo" | "cartao" | "crediario" | "servico" | "outro";
};

export type AlertaContrato = {
  nivel: "alto" | "medio" | "baixo";
  titulo: string;
  trecho?: string;
  orientacao: string;
};

export type EscudoResult = AgentResultBase & {
  alertas: AlertaContrato[];
  scoreRisco: number;
  checklistProtecao: string[];
};

const PATTERNS: { re: RegExp; nivel: AlertaContrato["nivel"]; titulo: string; orientacao: string }[] = [
  {
    re: /juros?.{0,40}(compost|capitaliz|anatoc)/i,
    nivel: "alto",
    titulo: "Possível capitalização de juros",
    orientacao: "Peça planilha do CET e compare com o que foi dito na venda. Não assine sob pressão.",
  },
  {
    re: /seguro\s+(prestamista|protegido|mais)|venda\s+casada/i,
    nivel: "alto",
    titulo: "Indício de venda casada / seguro embutido",
    orientacao: "Você pode recusar produtos opcionais. CDC protege contra venda casada.",
  },
  {
    re: /ren[uú]ncia.{0,30}direitos|abre\s+m[aã]o|foro\s+de\s+elei[cç][aã]o/i,
    nivel: "medio",
    titulo: "Cláusula de renúncia ou foro",
    orientacao: "Cláusulas abusivas podem ser nulas — não significa que a dívida some; peça revisão.",
  },
  {
    re: /confiss[aã]o\s+de\s+d[ií]vida|t[ií]tulo\s+executivo/i,
    nivel: "alto",
    titulo: "Confissão de dívida / título executivo",
    orientacao: "Só assine se entender o valor e as consequências. Em dúvida, não assine hoje.",
  },
  {
    re: /biometria|senha|token|chave\s+pix\s+permanente/i,
    nivel: "alto",
    titulo: "Pedido sensível de credenciais",
    orientacao: "A Fênix e qualquer credor sério NÃO pedem senha de banco/gov.br por contrato genérico.",
  },
  {
    re: /desconto\s+em\s+folha|margem\s+consign[aá]vel/i,
    nivel: "medio",
    titulo: "Desconto em folha / consignado",
    orientacao: "Confira se a margem e a autorização são suas. Golpes de consignado são comuns.",
  },
];

export function runEscudo(input: EscudoInput): EscudoResult {
  const text = input.textoContrato?.trim() ?? "";
  const alertas: AlertaContrato[] = [];

  if (text) {
    for (const p of PATTERNS) {
      const m = text.match(p.re);
      if (m) {
        alertas.push({
          nivel: p.nivel,
          titulo: p.titulo,
          trecho: m[0].slice(0, 80),
          orientacao: p.orientacao,
        });
      }
    }
    if (!alertas.length) {
      alertas.push({
        nivel: "baixo",
        titulo: "Nenhum padrão de risco óbvio no texto colado",
        orientacao: "Ainda assim leia CET, prazo, multa e o que acontece se atrasar. Em dúvida, não assine sob pressão.",
      });
    }
  }

  const scoreRisco = Math.min(
    100,
    alertas.reduce((s, a) => s + (a.nivel === "alto" ? 28 : a.nivel === "medio" ? 14 : 4), 0),
  );

  const checklistProtecao = [
    "Ative alertas de CPF nos bureaus oficiais/gratuitos quando disponíveis",
    "Guarde contratos e boletos no cofre Fênix",
    "Desconfie de empréstimo que “só precisa da senha”",
    "Compare CET, não só a parcela",
    "Nunca envie selfie+documento para desconhecidos",
    "Revise assinaturas em consignado que você não reconhece",
  ];

  const band = scoreRisco >= 40 ? "amarela" : "verde";

  return {
    alertas,
    scoreRisco,
    checklistProtecao,
    band,
    confidence: text ? 0.7 : 0.55,
    summary: text
      ? `Escudo: ${alertas.length} alerta(s), risco estimado ${scoreRisco}/100. Leitura preventiva — não substitui advogado.`
      : "Escudo: cole o texto do contrato ou use o checklist de proteção do CPF.",
    nextSteps: text
      ? alertas.filter((a) => a.nivel !== "baixo").map((a) => a.orientacao).slice(0, 3)
      : checklistProtecao.slice(0, 3),
    publicChannels: ["Consumidor.gov.br", "Procon", "site oficial do bureau de crédito"],
    audit: makeAudit("escudo", band, {
      notes: [`score=${scoreRisco}`, `alertas=${alertas.length}`],
      sources: ["Escudo v0.1", "padrões CDC de abuso (heurística)"],
      requiresLawyerReview: scoreRisco >= 50,
    }),
  };
}
