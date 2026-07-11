/**
 * Vigia — deadline watcher (deterministic scoring + reminder plan).
 * WhatsApp/e-mail delivery is planned; this layer computes what to watch.
 */

import type { Prazo } from "@/lib/data";
import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

export type VigiaInput = {
  prazos: Array<{
    titulo: string;
    desc?: string;
    chip?: string;
    /** ISO date or dd/mm or day+month labels from dashboard */
    dia?: string;
    mes?: string;
    dataIso?: string;
  }>;
  /** Reference "today" for tests */
  hoje?: Date;
};

export type VigiaAlerta = {
  titulo: string;
  criticidade: "critico" | "atencao" | "agendado";
  diasRestantes: number | null;
  mensagem: string;
  canais: ("whatsapp" | "email" | "painel")[];
};

export type VigiaResult = AgentResultBase & {
  alertas: VigiaAlerta[];
  proximos7dias: number;
  criticos: number;
};

const MES: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function parsePrazoDate(
  p: VigiaInput["prazos"][0],
  ref: Date,
): Date | null {
  if (p.dataIso) {
    const d = new Date(p.dataIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (p.dia && p.mes) {
    const m = MES[p.mes.toLowerCase().slice(0, 3)];
    if (m == null) return null;
    const day = parseInt(p.dia, 10);
    if (!Number.isFinite(day)) return null;
    let year = ref.getFullYear();
    const candidate = new Date(year, m, day);
    // if date already passed by >30d, assume next year
    if (candidate.getTime() < ref.getTime() - 30 * 86400000) {
      year += 1;
    }
    return new Date(year, m, day);
  }
  return null;
}

function daysBetween(a: Date, b: Date) {
  const ms = b.setHours(12, 0, 0, 0) - a.setHours(12, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function prazosFromDashboard(prazos: Prazo[]): VigiaInput["prazos"] {
  return prazos.map((p) => ({
    titulo: p.titulo,
    desc: p.desc,
    chip: p.chip,
    dia: p.dia,
    mes: p.mes,
  }));
}

export function runVigia(input: VigiaInput): VigiaResult {
  const hoje = input.hoje ?? new Date();
  const alertas: VigiaAlerta[] = [];

  for (const p of input.prazos) {
    const dt = parsePrazoDate(p, new Date(hoje));
    const dias = dt ? daysBetween(new Date(hoje), dt) : null;
    let criticidade: VigiaAlerta["criticidade"] = "agendado";
    if (dias != null && dias <= 3) criticidade = "critico";
    else if (dias != null && dias <= 7) criticidade = "atencao";
    else if (/cr[ií]tico|urgente/i.test(p.chip ?? "")) criticidade = "critico";

    const mensagem =
      dias == null
        ? `Acompanhar: ${p.titulo}. Cadastre a data completa para lembrete preciso.`
        : dias < 0
          ? `Prazo de “${p.titulo}” pode ter vencido há ${Math.abs(dias)} dia(s) — verifique com urgência.`
          : dias === 0
            ? `HOJE: ${p.titulo}. ${p.desc ?? ""}`
            : `Faltam ${dias} dia(s) para: ${p.titulo}.`;

    alertas.push({
      titulo: p.titulo,
      criticidade,
      diasRestantes: dias,
      mensagem: mensagem.trim(),
      canais: criticidade === "critico" ? ["whatsapp", "email", "painel"] : ["email", "painel"],
    });
  }

  alertas.sort((a, b) => {
    const order = { critico: 0, atencao: 1, agendado: 2 };
    return order[a.criticidade] - order[b.criticidade];
  });

  const criticos = alertas.filter((a) => a.criticidade === "critico").length;
  const proximos7dias = alertas.filter(
    (a) => a.diasRestantes != null && a.diasRestantes >= 0 && a.diasRestantes <= 7,
  ).length;

  const band: AutomationBand = criticos > 0 ? "vermelha" : proximos7dias > 0 ? "amarela" : "verde";

  return {
    alertas,
    proximos7dias,
    criticos,
    band,
    confidence: input.prazos.length ? 0.8 : 0.5,
    summary: input.prazos.length
      ? `Vigia: ${input.prazos.length} prazo(s), ${criticos} crítico(s), ${proximos7dias} nos próximos 7 dias.`
      : "Nenhum prazo cadastrado. A Íris extrai datas de citações para o Vigia.",
    nextSteps: [
      "Confirme datas de recebimento de citações (contam o prazo).",
      "Ative lembretes no painel (WhatsApp/e-mail na próxima onda de envio).",
      criticos > 0 ? "Há prazo crítico: fale com a Clara ou acione atendimento prioritário." : "Revise a agenda semanal no painel.",
    ],
    publicChannels: ["Painel Fênix · Prazos", "Defensoria se prazo judicial e sem advogado"],
    audit: makeAudit("vigia", band, {
      notes: [`n=${input.prazos.length}`, `criticos=${criticos}`],
      sources: ["motor Vigia v0.1"],
      requiresLawyerReview: criticos > 0,
    }),
  };
}
