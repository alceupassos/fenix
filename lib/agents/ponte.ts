/**
 * Ponte — government / public services pathfinder.
 * Only recommends official public channels; never asks for gov.br passwords.
 */

import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type PonteTema =
  | "receita_cpf"
  | "pgfn_divida_ativa"
  | "inss_beneficio"
  | "mei_das"
  | "fala_br"
  | "desconhecido";

export type PonteInput = {
  tema?: PonteTema;
  freeText?: string;
};

export type PontePasso = {
  ordem: number;
  titulo: string;
  desc: string;
  urlOficial?: string;
  gratuito: boolean;
};

export type PonteResult = AgentResultBase & {
  tema: PonteTema;
  passos: PontePasso[];
  documentos: string[];
};

const CATALOG: Record<
  Exclude<PonteTema, "desconhecido">,
  { label: string; passos: Omit<PontePasso, "ordem">[]; docs: string[]; band: AutomationBand }
> = {
  receita_cpf: {
    label: "Receita Federal / CPF",
    band: "verde",
    docs: ["CPF", "título de eleitor ou recibo de IR se houver", "comprovante de endereço"],
    passos: [
      {
        titulo: "Consultar situação do CPF",
        desc: "Use o portal da Receita Federal (e-CAC / app CPF). A Fênix nunca pede sua senha gov.br.",
        urlOficial: "https://www.gov.br/receitafederal",
        gratuito: true,
      },
      {
        titulo: "Identificar pendência",
        desc: "Anote o código/motivo da irregularidade (cadastro, declaração, malha).",
        gratuito: true,
      },
      {
        titulo: "Regularizar no canal oficial",
        desc: "Siga a orientação do próprio portal. Se for dívida, veja também PGFN/Regularize.",
        gratuito: true,
      },
    ],
  },
  pgfn_divida_ativa: {
    label: "PGFN / Dívida Ativa / Regularize",
    band: "amarela",
    docs: ["CPF/CNPJ", "número da inscrição se tiver", "comprovantes de renda"],
    passos: [
      {
        titulo: "Consultar no Regularize",
        desc: "Portal oficial da PGFN para ver débitos inscritos e opções de acordo.",
        urlOficial: "https://www.regularize.pgfn.gov.br",
        gratuito: true,
      },
      {
        titulo: "Comparar modalidades",
        desc: "À vista, parcelamento, transação — calcule se cabe no seu mínimo existencial (Atlas).",
        gratuito: true,
      },
      {
        titulo: "Revisão humana se penhora/bloqueio",
        desc: "Bloqueio de conta ou penhora: encaminhar à Oficina + advogado (Botão Fênix).",
        gratuito: false,
      },
    ],
  },
  inss_beneficio: {
    label: "INSS / Meu INSS",
    band: "amarela",
    docs: ["CPF", "documentos médicos", "comprovantes de renda familiar", "carta de indeferimento"],
    passos: [
      {
        titulo: "Acessar Meu INSS",
        desc: "Requerimentos, recursos e acompanhamento são gratuitos no app/site oficial.",
        urlOficial: "https://www.gov.br/inss",
        gratuito: true,
      },
      {
        titulo: "Organizar documentos",
        desc: "A Íris ajuda a listar o que falta; você anexa no Meu INSS.",
        gratuito: true,
      },
      {
        titulo: "Recurso ou revisão",
        desc: "Se suspenso/negado, a Oficina prepara rascunho; advogado revisa se houver contencioso.",
        gratuito: true,
      },
    ],
  },
  mei_das: {
    label: "MEI / DAS / baixa",
    band: "verde",
    docs: ["CNPJ MEI", "DAS em atraso", "RG/CPF"],
    passos: [
      {
        titulo: "Portal do Empreendedor",
        desc: "Emitir DAS, parcelar ou solicitar baixa apenas nos canais oficiais.",
        urlOficial: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor",
        gratuito: true,
      },
      {
        titulo: "Parcelamento de débitos",
        desc: "Verifique parcelamento no PGMEI / Receita antes de assumir dívida pessoal.",
        gratuito: true,
      },
      {
        titulo: "Plano de continuidade",
        desc: "Atlas ajuda a ver se o MEI ainda cabe no orçamento familiar.",
        gratuito: true,
      },
    ],
  },
  fala_br: {
    label: "Fala.BR / ouvidoria pública",
    band: "verde",
    docs: ["Relato objetivo", "protocolos anteriores", "CPF"],
    passos: [
      {
        titulo: "Registrar no Fala.BR",
        desc: "Manifestação, reclamação ou denúncia contra órgãos federais — gratuito.",
        urlOficial: "https://falabr.cgu.gov.br",
        gratuito: true,
      },
      {
        titulo: "Guardar protocolo",
        desc: "O Vigia pode lembrar prazos de resposta se você cadastrar o protocolo no painel.",
        gratuito: true,
      },
    ],
  },
};

function detectTema(text: string): PonteTema {
  const t = text.toLowerCase();
  if (/inss|bpc|aposent|aux[ií]lio|benef[ií]cio/.test(t)) return "inss_beneficio";
  if (/pgfn|d[ií]vida ativa|regularize|uni[aã]o/.test(t)) return "pgfn_divida_ativa";
  if (/mei|das\b|simei|empreendedor/.test(t)) return "mei_das";
  if (/cpf|receita|malha|irpf|e-?cac/.test(t)) return "receita_cpf";
  if (/fala\.?br|ouvidoria|[oó]rg[aã]o p[uú]blico/.test(t)) return "fala_br";
  return "desconhecido";
}

export function runPonte(input: PonteInput): PonteResult {
  const tema =
    input.tema && input.tema !== "desconhecido"
      ? input.tema
      : detectTema(input.freeText ?? "");

  if (tema === "desconhecido") {
    return {
      tema,
      passos: [
        {
          ordem: 1,
          titulo: "Conte qual órgão",
          desc: "Receita, INSS, PGFN, MEI ou outro? A Ponte monta o caminho oficial gratuito.",
          gratuito: true,
        },
      ],
      documentos: [],
      band: "verde",
      confidence: 0.4,
      summary: "Ainda não identifiquei o órgão. Descreva o problema (CPF, INSS, dívida ativa, MEI…).",
      nextSteps: ["Fale com a Clara ou escolha um tema da Ponte."],
      publicChannels: ["gov.br", "Defensoria Pública"],
      audit: makeAudit("ponte", "verde", {
        notes: ["tema=desconhecido"],
        sources: ["roteiro Ponte v0.1"],
      }),
    };
  }

  const cat = CATALOG[tema];
  const passos = cat.passos.map((p, i) => ({ ...p, ordem: i + 1 }));

  return {
    tema,
    passos,
    documentos: cat.docs,
    band: cat.band,
    confidence: 0.85,
    summary: `Ponte: caminho para ${cat.label}. Etapas oficiais e gratuitas sempre sinalizadas. Nunca pedimos senha gov.br.`,
    nextSteps: passos.map((p) => p.titulo),
    publicChannels: passos.filter((p) => p.urlOficial).map((p) => p.urlOficial!),
    audit: makeAudit("ponte", cat.band, {
      notes: [`tema=${tema}`],
      sources: ["roteiro Ponte v0.1", "canais públicos oficiais"],
      requiresLawyerReview: cat.band !== "verde",
    }),
  };
}
