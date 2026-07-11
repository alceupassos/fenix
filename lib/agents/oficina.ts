/**
 * Oficina — legal document draft preparation (templates + structure).
 * NEVER invents jurisprudence. Minutas always require Botão Fênix.
 */

import { type AgentResultBase, makeAudit } from "./types";

export type OficinaKind = "contestacao_cobranca" | "desbloqueio_salario" | "carta_negacao" | "recurso_bpc";

export type OficinaInput = {
  kind: OficinaKind;
  nomeUsuario: string;
  fatos: string;
  valorCausa?: string;
  numeroProcesso?: string;
  comarca?: string;
  documentos?: string[];
};

export type OficinaResult = AgentResultBase & {
  kind: OficinaKind;
  titulo: string;
  minuta: string;
  checklist: string[];
  camposFaltantes: string[];
  confiancaIA: number;
  fontes: string[];
};

const FONTES_BASE = [
  "CPC — estrutura de contestação (consulte versão vigente; não inventamos artigos não conferidos)",
  "CDC — proteção ao consumidor (referência de princípio)",
  "CF/88 art. 5º — devido processo legal (referência constitucional genérica)",
];

function header(nome: string, processo?: string, comarca?: string) {
  const end = comarca
    ? `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${comarca.toUpperCase()}`
    : `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO`;
  const autos = processo ? `\n\nAutos nº ${processo}` : "\n\n[número do processo — confirmar]";
  return `${end}${autos}\n\n${nome.toUpperCase()}, já qualificado(a), vem, por seu advogado, apresentar a seguinte peça:`;
}

export function runOficina(input: OficinaInput): OficinaResult {
  const nome = input.nomeUsuario?.trim() || "[NOME DO USUÁRIO]";
  const fatos = input.fatos?.trim() || "[relato dos fatos a preencher]";
  const faltantes: string[] = [];
  if (!input.nomeUsuario?.trim()) faltantes.push("nome completo do usuário");
  if (!input.fatos?.trim()) faltantes.push("relato dos fatos");
  if (!input.numeroProcesso?.trim()) faltantes.push("número do processo (CNJ)");
  if (!input.comarca?.trim()) faltantes.push("vara/comarca");

  let titulo = "";
  let minuta = "";
  let checklist: string[] = [];
  let fontes = [...FONTES_BASE];

  switch (input.kind) {
    case "contestacao_cobranca":
      titulo = "Minuta de contestação — ação de cobrança";
      checklist = [
        "Comprovantes de pagamento anexos",
        "Contrato ou fatura base da cobrança",
        "Cópia da citação com data de recebimento",
        "Qualificação completa e procuração",
      ];
      if (!input.valorCausa) faltantes.push("valor da causa");
      minuta =
        `${header(nome, input.numeroProcesso, input.comarca)}\n\n` +
        `CONTESTAÇÃO\n\n` +
        `I — DOS FATOS\n${fatos}\n\n` +
        `II — DO DIREITO\n` +
        `A parte requerida impugna os valores e/ou a forma de cobrança, reservando-se o direito de ` +
        `especificar teses após conferência dos documentos. ` +
        `[TRECHO DESTACADO PARA REVISÃO DO ADVOGADO — não citar jurisprudência sem confirmação de ` +
        `tribunal, número e ementa.]\n\n` +
        `III — DOS PEDIDOS\n` +
        `Requer-se: (a) o recebimento da contestação; (b) a improcedência total ou parcial; ` +
        `(c) a produção de provas; (d) a condenação da parte contrária nos ônus de sucumbência, se o caso.\n\n` +
        `Protesta provar o alegado por todos os meios em direito admitidos.\n\n` +
        `Local e data.\n\n[Advogado responsável — OAB]\n\n` +
        `---\nMetadados Fênix: peça gerada pela Oficina v0.1 · exige Botão Fênix · ` +
        `campos inferidos vs confirmados revisados pelo advogado · sem jurisprudência inventada.`;
      break;

    case "desbloqueio_salario":
      titulo = "Minuta de pedido de desbloqueio — verba alimentar";
      checklist = [
        "Extratos comprovando origem salarial",
        "Holerites dos últimos 3 meses",
        "Comprovante do bloqueio (SISBAJUD/extrato)",
      ];
      fontes = [
        ...FONTES_BASE,
        "CPC — impenhorabilidade de verbas salariais (conferir artigo vigente na data do protocolo)",
      ];
      minuta =
        `${header(nome, input.numeroProcesso, input.comarca)}\n\n` +
        `PEDIDO DE DESBLOQUEIO DE VALORES\n\n` +
        `I — DOS FATOS\n${fatos}\n\n` +
        `II — DA NATUREZA ALIMENTAR DOS VALORES\n` +
        `Os extratos e holerites anexos demonstram que os valores constritos decorrem de verba salarial. ` +
        `[REVISÃO OBRIGATÓRIA DO ADVOGADO — fundamentação legal e jurisprudência somente com fonte confirmada.]\n\n` +
        `III — DOS PEDIDOS\n` +
        `Requer-se o desbloqueio integral ou na medida da impenhorabilidade, com urgência.\n\n` +
        `Local e data.\n\n[Advogado responsável — OAB]`;
      break;

    case "carta_negacao":
      titulo = "Carta de não reconhecimento de dívida";
      checklist = ["RG/CPF", "Boletim de ocorrência se fraude", "Extratos relevantes"];
      minuta =
        `À instituição / credor\n\n` +
        `Eu, ${nome}, venho DECLARAR que não reconheço a dívida descrita a seguir:\n${fatos}\n\n` +
        `Solicito: (1) cópia integral do contrato e gravações; (2) suspensão de cobranças e negativação ` +
        `até esclarecimento; (3) resposta por escrito em prazo razoável.\n\n` +
        `Esta declaração não constitui confissão de dívida.\n\nAtenciosamente,\n${nome}\n\n` +
        `---\nGerado pela Oficina · revisão humana recomendada antes do envio.`;
      break;

    case "recurso_bpc":
      titulo = "Minuta de recurso administrativo — BPC/INSS";
      checklist = ["Carta de indeferimento/suspensão", "Documentos de renda familiar", "Laudo médico atualizado"];
      fontes = ["Instruções Meu INSS / canal público gratuito", "LOAS/BPC — conferir requisitos vigentes"];
      minuta =
        `AO INSTITUTO NACIONAL DO SEGURO SOCIAL — JUNTA DE RECURSOS\n\n` +
        `Recorrente: ${nome}\n\n` +
        `I — DOS FATOS\n${fatos}\n\n` +
        `II — DAS RAZÕES\n` +
        `O(a) recorrente discorda da decisão administrativa e apresenta documentos que demonstram ` +
        `preenchimento dos requisitos. [REVISÃO DO ADVOGADO / assistente social se necessário.]\n\n` +
        `III — DO PEDIDO\nRequer-se o provimento do recurso e restabelecimento/concessão do benefício.\n\n` +
        `Canal público: Meu INSS (gratuito).\n\nLocal e data.\n${nome}`;
      break;
  }

  const confiancaIA = Math.max(0.35, 0.9 - faltantes.length * 0.12);

  return {
    kind: input.kind,
    titulo,
    minuta,
    checklist,
    camposFaltantes: faltantes,
    confiancaIA,
    fontes,
    band: "amarela",
    confidence: confiancaIA,
    summary: `${titulo} preparada. Faixa amarela: só segue após Botão Fênix (advogado). ` +
      (faltantes.length ? `Faltam: ${faltantes.join(", ")}.` : "Campos principais preenchidos."),
    nextSteps: [
      "Advogado revisa, edita e decide no Botão Fênix.",
      "Anexar documentos do checklist antes do protocolo.",
      "Nunca protocolar minuta sem aprovação profissional.",
    ],
    publicChannels: [
      "Defensoria Pública (se elegível)",
      "Meu INSS (recurso BPC)",
      "Consumidor.gov.br (via administrativa paralela, se couber)",
    ],
    audit: makeAudit("oficina", "amarela", {
      notes: [`kind=${input.kind}`, `faltantes=${faltantes.length}`, "sem_jurisprudencia_inventada"],
      sources: fontes,
      requiresLawyerReview: true,
    }),
  };
}
