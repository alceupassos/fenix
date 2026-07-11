/**
 * In-process audit trail for legal/automation actions.
 * Survives within the Node process; optionally mirrors to console for ops.
 * Future: persist to Postgres audit_events table.
 */

export type AuditEvent = {
  id: string;
  at: string;
  actor: string; // user email, advogado name, or "sistema"
  agent: string;
  action: string;
  entityType?: string;
  entityId?: string;
  band?: string;
  payload?: Record<string, unknown>;
  requiresLawyerReview?: boolean;
};

const store: AuditEvent[] = [];
const MAX = 2000;

function uid() {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function appendAudit(
  partial: Omit<AuditEvent, "id" | "at"> & { at?: string },
): AuditEvent {
  const ev: AuditEvent = {
    id: uid(),
    at: partial.at ?? new Date().toISOString(),
    actor: partial.actor,
    agent: partial.agent,
    action: partial.action,
    entityType: partial.entityType,
    entityId: partial.entityId,
    band: partial.band,
    payload: partial.payload,
    requiresLawyerReview: partial.requiresLawyerReview,
  };
  store.push(ev);
  if (store.length > MAX) store.splice(0, store.length - MAX);
  if (process.env.FENIX_AUDIT_LOG === "1") {
    console.info("[fenix-audit]", JSON.stringify(ev));
  }
  return ev;
}

export function listAudit(limit = 50, filter?: { agent?: string; entityId?: string }): AuditEvent[] {
  let rows = store;
  if (filter?.agent) rows = rows.filter((e) => e.agent === filter.agent);
  if (filter?.entityId) rows = rows.filter((e) => e.entityId === filter.entityId);
  return rows.slice(-limit).reverse();
}

export function clearAuditForTests() {
  store.length = 0;
}
