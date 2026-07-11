/**
 * Acordo — debt negotiation simulator (calculators first).
 * Never promises creditor acceptance; produces proposals for user confirmation.
 */

import type { AtlasDebtInput } from "./atlas";
import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type AcordoInput = {
  debts: AtlasDebtInput[];
  disponivelMes: number;
  /** Preferred months for installment (default 12). */
  meses?: number;
  /** Optional target discount 0–1 for à vista (default 0.45). */
  descontoVista?: number;
};

export type PropostaCredor = {
  credor: string;
  original: number;
  status: string;
  aVista: number;
  descontoVistaPct: number;
  parcela: number;
  nParcelas: number;
  totalParcelado: number;
  cabenoOrcamento: boolean;
  recomendacao: "a_vista" | "parcelar" | "contestar_antes" | "priorizar_essencial" | "aguardar_advogado";
  cartaRascunho: string;
};

export type AcordoResult = AgentResultBase & {
  propostas: PropostaCredor[];
  totalOriginal: number;
  totalSugeridoVista: number;
  parcelaMaximaSegura: number;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function carta(p: PropostaCredor): string {
  return (
    `Prezado(a) setor de acordos — ${p.credor},\n\n` +
    `Venho por meio desta solicitar proposta de quitação/renegociação do débito ` +
    `no valor original de ${fmt(p.original)}. ` +
    (p.recomendacao === "a_vista"
      ? `Ofereço pagamento à vista de ${fmt(p.aVista)} (${p.descontoVistaPct}% de desconto).`
      : `Ofereço parcelamento em ${p.nParcelas}x de ${fmt(p.parcela)}, total ${fmt(p.totalParcelado)}, ` +
        `compatível com minha capacidade de pagamento após despesas essenciais.`) +
    `\n\nAguardo retorno por escrito com condições, prazo de validade e forma de quitação. ` +
    `Esta mensagem não reconhece valores contestados nem renuncia a direitos.\n\nAtenciosamente,`
  );
}

export function runAcordo(input: AcordoInput): AcordoResult {
  const meses = Math.min(48, Math.max(3, input.meses ?? 12));
  const descVista = Math.min(0.7, Math.max(0.15, input.descontoVista ?? 0.45));
  const disponivel = Math.max(0, input.disponivelMes);
  // Reserve 20% buffer so proposal doesn't eat the entire surplus
  const parcelaMax = Math.floor(disponivel * 0.8);

  const propostas: PropostaCredor[] = input.debts.map((d) => {
    const original = Math.round(d.valor);
    const aVista = Math.round(original * (1 - descVista));
    const descontoVistaPct = Math.round(descVista * 100);

    let recomendacao: PropostaCredor["recomendacao"] = "parcelar";
    let nParcelas = meses;
    let parcela = Math.ceil(original / nParcelas);
    let totalParcelado = parcela * nParcelas;

    if (/contest|n[aã]o reconhec/i.test(d.status + (d.tipo ?? ""))) {
      recomendacao = "contestar_antes";
      nParcelas = 0;
      parcela = 0;
      totalParcelado = 0;
    } else if (/ju[ií]zo|processo/i.test(d.status)) {
      recomendacao = "aguardar_advogado";
    } else if (/priorit|essencial|energia|luz|água|agua|condom/i.test(d.status + (d.tipo ?? ""))) {
      recomendacao = "priorizar_essencial";
      // shorter term for essentials
      nParcelas = Math.min(6, meses);
      parcela = Math.ceil(original / nParcelas);
      totalParcelado = parcela * nParcelas;
    } else if (aVista <= disponivel * 2 && disponivel > 0) {
      recomendacao = "a_vista";
    } else {
      // fit installments into budget
      nParcelas = meses;
      parcela = Math.ceil(original / nParcelas);
      while (parcela > parcelaMax && nParcelas < 48 && parcelaMax > 0) {
        nParcelas += 3;
        parcela = Math.ceil(original / nParcelas);
      }
      totalParcelado = parcela * nParcelas;
      if (parcelaMax === 0) recomendacao = "priorizar_essencial";
    }

    const cabenoOrcamento =
      recomendacao === "a_vista"
        ? aVista <= disponivel * 3
        : recomendacao === "contestar_antes" || recomendacao === "aguardar_advogado"
          ? true
          : parcela <= parcelaMax || parcelaMax === 0;

    const base: PropostaCredor = {
      credor: d.credor,
      original,
      status: d.status,
      aVista,
      descontoVistaPct,
      parcela,
      nParcelas,
      totalParcelado,
      cabenoOrcamento,
      recomendacao,
      cartaRascunho: "",
    };
    base.cartaRascunho = carta(base);
    return base;
  });

  const totalOriginal = propostas.reduce((s, p) => s + p.original, 0);
  const totalSugeridoVista = propostas
    .filter((p) => p.recomendacao !== "contestar_antes")
    .reduce((s, p) => s + p.aVista, 0);

  const temJuizo = propostas.some((p) => p.recomendacao === "aguardar_advogado");
  const band: AutomationBand = temJuizo ? "amarela" : "verde";

  return {
    propostas,
    totalOriginal,
    totalSugeridoVista,
    parcelaMaximaSegura: parcelaMax,
    band,
    confidence: input.debts.length ? 0.78 : 0.4,
    summary: input.debts.length
      ? `Simulação Acordo: ${propostas.length} credor(es), total ${fmt(totalOriginal)}. ` +
        `Parcela máxima segura estimada ${fmt(parcelaMax)}/mês (80% da sobra). ` +
        `Nenhuma proposta é enviada sem sua autorização.`
      : "Sem dívidas para simular. Cadastre credores no Atlas primeiro.",
    nextSteps: [
      "Revise cada proposta — desconto à vista é hipotético até o credor confirmar.",
      "Não aceite a primeira oferta no escuro; compare com a sua sobra real.",
      "Dívidas em juízo ou contestáveis passam pelo advogado (Botão Fênix).",
      "Canais públicos: SAC/ouvidoria do credor e, se for o caso, Procon.",
    ],
    publicChannels: ["SAC e ouvidoria do credor", "Procon", "Consumidor.gov.br"],
    audit: makeAudit("acordo", band, {
      notes: [`n=${propostas.length}`, `parcelaMax=${parcelaMax}`, `meses=${meses}`],
      sources: ["calculadora Acordo v0.1", "capacidade de pagamento Atlas"],
      requiresLawyerReview: temJuizo,
    }),
  };
}
