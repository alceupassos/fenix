/**
 * Botão Fênix — lawyer decision actions on prepared measures.
 */

import { appendAudit } from "@/lib/audit";

export type FenixAction =
  | "aprovar"
  | "aprovar_com_alteracoes"
  | "solicitar_documentos"
  | "encaminhar_humano"
  | "rejeitar"
  | "marcar_urgente";

export type FenixDecisionInput = {
  caseId: string;
  caseTitle: string;
  action: FenixAction;
  actorName: string;
  actorOab?: string;
  notes?: string;
  minutaVersion?: number;
};

export type FenixDecision = {
  id: string;
  at: string;
  caseId: string;
  caseTitle: string;
  action: FenixAction;
  actorName: string;
  actorOab?: string;
  notes?: string;
  minutaVersion: number;
  statusLabel: string;
  canProtocol: boolean;
};

const decisions: FenixDecision[] = [];

const LABELS: Record<FenixAction, { statusLabel: string; canProtocol: boolean }> = {
  aprovar: { statusLabel: "Minuta aprovada e liberada para protocolo", canProtocol: true },
  aprovar_com_alteracoes: {
    statusLabel: "Aprovada com alterações do advogado",
    canProtocol: true,
  },
  solicitar_documentos: {
    statusLabel: "Documentos solicitados ao usuário",
    canProtocol: false,
  },
  encaminhar_humano: {
    statusLabel: "Encaminhado para atendimento humano prioritário",
    canProtocol: false,
  },
  rejeitar: { statusLabel: "Medida rejeitada — não protocolar", canProtocol: false },
  marcar_urgente: { statusLabel: "Caso marcado como urgente na fila", canProtocol: false },
};

export function applyFenixButton(input: FenixDecisionInput): FenixDecision {
  const meta = LABELS[input.action];
  const decision: FenixDecision = {
    id: `fx_${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    action: input.action,
    actorName: input.actorName,
    actorOab: input.actorOab,
    notes: input.notes,
    minutaVersion: input.minutaVersion ?? 1,
    statusLabel: meta.statusLabel,
    canProtocol: meta.canProtocol,
  };
  decisions.push(decision);

  appendAudit({
    actor: `${input.actorName}${input.actorOab ? ` · ${input.actorOab}` : ""}`,
    agent: "botao_fenix",
    action: input.action,
    entityType: "case",
    entityId: input.caseId,
    band: "amarela",
    requiresLawyerReview: false,
    payload: {
      caseTitle: input.caseTitle,
      notes: input.notes,
      canProtocol: meta.canProtocol,
      minutaVersion: decision.minutaVersion,
    },
  });

  return decision;
}

export function listFenixDecisions(caseId?: string): FenixDecision[] {
  const rows = caseId ? decisions.filter((d) => d.caseId === caseId) : decisions;
  return [...rows].reverse();
}
