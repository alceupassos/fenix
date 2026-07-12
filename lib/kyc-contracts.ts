/**
 * Contratos Onda KYC — fonte de verdade para schema, APIs e agentes.
 * Estende o app existente; não substitui AgentResultBase/makeAudit.
 */

import type { AgentResultBase, AutomationBand, ProvenanceField } from "@/lib/agents/types";

/** Status de verificação do cliente (cadastro/KYC). */
export type VerificationStatus = "nao_verificado" | "pendente" | "verificado" | "reprovado";

/** Tipos de documento aceitos no cofre. */
export type VaultDocKind = "rg" | "cnh" | "cpf" | "comprovante" | "selfie" | "outro";

/** Consentimentos LGPD versionados (granular). */
export type ConsentPurpose =
  | "termos_uso"
  | "privacidade"
  | "documentos"
  | "biometria"
  | "comunicacao"
  | "marketing";

export const CONSENT_TERM_VERSION = "2026-07-kyc-1.0";

/** Retention defaults (days) for sensitive data. */
export const RETENTION_DAYS = {
  vaultDocument: 365 * 2,
  biometryArtifact: 30,
  kycSession: 90,
  accessLog: 365,
} as const;

/** CNH service intents (núcleo trânsito). */
export type CnhServiceKind =
  | "perda_roubo_extravio"
  | "renovacao"
  | "mudanca_categoria"
  | "primeira_habilitacao"
  | "cnh_digital"
  | "consulta_pontos"
  | "recurso_multa"
  | "suspensao_cassacao"
  | "crlv_licenciamento_ipva";

export type MultaRecursoEtapa = "defesa_previa" | "jari" | "cetran";

/** Standard agent-style output for doc check / KYC. */
export type DocCheckResult = AgentResultBase & {
  campos: Record<string, ProvenanceField>;
  provenance: Record<string, ProvenanceField["provenance"]>;
  confidence: number;
  band: AutomationBand;
  fraudScore: number;
  crossCheck: {
    nomeMatch: boolean | null;
    cpfMatch: boolean | null;
    dataMatch: boolean | null;
    divergences: string[];
  };
};

export type KycLivenessMode = "passive" | "active" | "video_fallback" | "webauthn";

export type KycProviderResult = {
  provider: string;
  sessionId: string;
  status: "mock_pass" | "mock_fail" | "pending" | "pass" | "fail" | "review";
  faceMatchScore: number | null;
  livenessScore: number | null;
  band: AutomationBand;
  requiresLawyerReview: boolean;
  raw?: Record<string, unknown>;
};
