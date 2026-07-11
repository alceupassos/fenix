/**
 * Shared contracts for Fênix AI agent pipelines.
 * Layers (§17): rules → calculators → validation → (optional LLM) → human review → audit trail.
 */

/** Automation band — who acts next. */
export type AutomationBand = "verde" | "amarela" | "vermelha";

/** Field provenance for legal/financial outputs. */
export type FieldProvenance = "confirmed" | "inferred" | "missing";

export type ProvenanceField<T = string> = {
  value: T | null;
  provenance: FieldProvenance;
  confidence: number; // 0–1
  source?: string;
};

export type AuditTrail = {
  agent: string;
  version: string;
  at: string; // ISO
  band: AutomationBand;
  notes: string[];
  sources: string[];
  requiresLawyerReview: boolean;
};

export type AgentResultBase = {
  band: AutomationBand;
  confidence: number;
  summary: string;
  nextSteps: string[];
  publicChannels: string[];
  audit: AuditTrail;
};

export function nowIso() {
  return new Date().toISOString();
}

export function makeAudit(
  agent: string,
  band: AutomationBand,
  opts: { notes?: string[]; sources?: string[]; requiresLawyerReview?: boolean; version?: string } = {},
): AuditTrail {
  return {
    agent,
    version: opts.version ?? "0.1.0",
    at: nowIso(),
    band,
    notes: opts.notes ?? [],
    sources: opts.sources ?? [],
    requiresLawyerReview: opts.requiresLawyerReview ?? band !== "verde",
  };
}
