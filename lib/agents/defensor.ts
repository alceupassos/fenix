/**
 * Defensor do Consumidor — administrative complaint ladder.
 * SAC → ouvidoria → Consumidor.gov.br → Procon → regulador → notificação → jurídico.
 */

import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type DefensorInput = {
  empresa: string;
  problema: string;
  /** Steps already done */
  jaFez?: Array<"sac" | "ouvidoria" | "consumidor_gov" | "procon" | "regulador">;
  valorEnvolvido?: string;
};

export type EscadaDegrau = {
  id: string;
  nome: string;
  status: "feito" | "agora" | "depois" | "pular_se";
  desc: string;
  canalPublico: boolean;
  url?: string;
  prazoTipico: string;
};

export type DefensorResult = AgentResultBase & {
  empresa: string;
  escada: EscadaDegrau[];
  rascunhoReclamacao: string;
  proximoDegrau: string;
};

const ORDEM = ["sac", "ouvidoria", "consumidor_gov", "procon", "regulador", "notificacao", "juridico"] as const;

export function runDefensor(input: DefensorInput): DefensorResult {
  const empresa = input.empresa?.trim() || "a empresa";
  const problema = input.problema?.trim() || "o problema relatado";
  const done = new Set(input.jaFez ?? []);

  const labels: Record<string, Omit<EscadaDegrau, "id" | "status">> = {
    sac: {
      nome: "SAC / atendimento",
      desc: `Registre protocolo no SAC de ${empresa}. Guarde número, data e nome do atendente.`,
      canalPublico: true,
      prazoTipico: "3–5 dias úteis",
    },
    ouvidoria: {
      nome: "Ouvidoria",
      desc: "Se o SAC não resolver, abra na ouvidoria com o protocolo anterior.",
      canalPublico: true,
      prazoTipico: "até 10 dias úteis (varia)",
    },
    consumidor_gov: {
      nome: "Consumidor.gov.br",
      desc: "Plataforma pública gratuita de mediação com empresas participantes.",
      canalPublico: true,
      url: "https://www.consumidor.gov.br",
      prazoTipico: "até 10 dias para resposta da empresa",
    },
    procon: {
      nome: "Procon",
      desc: "Reclamação no Procon do seu estado — canal público, sem custo de taxa típica de processo.",
      canalPublico: true,
      prazoTipico: "conforme agenda local",
    },
    regulador: {
      nome: "Regulador setorial",
      desc: "Banco Central, ANS, Anatel, Aneel etc., conforme o setor — só se aplicável.",
      canalPublico: true,
      prazoTipico: "varia",
    },
    notificacao: {
      nome: "Notificação extrajudicial",
      desc: "A Oficina prepara rascunho; envio com prova de recebimento. Revisão recomendada.",
      canalPublico: false,
      prazoTipico: "5–15 dias para resposta",
    },
    juridico: {
      nome: "Via jurídica",
      desc: "Só após esgotar ou se houver urgência/dano. Advogado decide no Botão Fênix.",
      canalPublico: false,
      prazoTipico: "conforme rito",
    },
  };

  let foundAgora = false;
  const escada: EscadaDegrau[] = ORDEM.map((id) => {
    const base = labels[id];
    if (done.has(id as "sac")) {
      return { id, status: "feito" as const, ...base };
    }
    if (!foundAgora) {
      foundAgora = true;
      return { id, status: "agora" as const, ...base };
    }
    return { id, status: "depois" as const, ...base };
  });

  const agora = escada.find((e) => e.status === "agora")!;
  const band: AutomationBand = agora.id === "juridico" || agora.id === "notificacao" ? "amarela" : "verde";

  const rascunhoReclamacao =
    `Reclamação — ${empresa}\n\n` +
    `Prezados,\n\n` +
    `Venho registrar reclamação referente a: ${problema}.\n` +
    (input.valorEnvolvido ? `Valor envolvido: ${input.valorEnvolvido}.\n` : "") +
    `\nSolicito: (1) solução no prazo regulatório; (2) resposta por escrito; ` +
    `(3) cancelamento de cobranças indevidas, se houver.\n\n` +
    `Protocolos anteriores: ${[...done].join(", ") || "nenhum informado"}.\n\n` +
    `Atenciosamente,\n[Nome]\n\n` +
    `---\nRascunho do Defensor Fênix · você pode enviar grátis no canal público indicado · ` +
    `não é petição judicial.`;

  return {
    empresa,
    escada,
    rascunhoReclamacao,
    proximoDegrau: agora.nome,
    band,
    confidence: 0.82,
    summary: `Defensor: próximo passo com ${empresa} é “${agora.nome}”. ` +
      (agora.canalPublico ? "Canal público/gratuito disponível — não precisa pagar por esta etapa." : "Etapa preparatória com revisão."),
    nextSteps: [
      `Executar: ${agora.nome}`,
      agora.desc,
      "Guarde protocolos — o painel de reclamações acompanha o andamento.",
    ],
    publicChannels: escada.filter((e) => e.canalPublico && e.url).map((e) => e.url!),
    audit: makeAudit("defensor", band, {
      notes: [`proximo=${agora.id}`, `empresa=${empresa}`],
      sources: ["escada administrativa Defensor v0.1", "Consumidor.gov.br"],
      requiresLawyerReview: band !== "verde",
    }),
  };
}
