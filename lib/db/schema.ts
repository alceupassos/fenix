import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  serial,
  jsonb,
} from "drizzle-orm/pg-core";

/** Users — replaces the demo directory in lib/users.ts once seeded. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // 'user' | 'advogado'
  oab: text("oab"),
  /** E.164-ish phone / WhatsApp digits */
  phone: text("phone"),
  /** CPF digits only (11). Sensitive — mask in logs. */
  cpf: text("cpf"),
  /** nao_verificado | pendente | verificado | reprovado */
  verificationStatus: text("verification_status").notNull().default("nao_verificado"),
  onboardingStep: text("onboarding_step").notNull().default("dados"), // dados|documentos|facial|pronto
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Granular LGPD consents (versioned terms). */
export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(), // termos_uso|privacidade|documentos|biometria|comunicacao|marketing
  granted: boolean("granted").notNull(),
  termVersion: text("term_version").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/** Encrypted vault file metadata (bytes live in S3 or local .data/vault). */
export const vaultFiles = pgTable("vault_files", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // rg|cnh|cpf|comprovante|selfie|outro
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(), // UUID filename path
  storageBackend: text("storage_backend").notNull().default("local"), // local|s3
  encrypted: boolean("encrypted").notNull().default(true),
  originalNameHash: text("original_name_hash"), // hash only, never store original name in clear
  status: text("status").notNull().default("uploaded"), // uploaded|checking|ok|rejeitado|expirado
  retentionUntil: timestamp("retention_until", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Access trail for vault / biometry (LGPD art. 11). */
export const vaultAccessLog = pgTable("vault_access_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vaultFileId: text("vault_file_id"),
  actor: text("actor").notNull(),
  action: text("action").notNull(), // upload|download|view|delete|check|kyc
  ip: text("ip"),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

/** Document check / OCR results. */
export const documentChecks = pgTable("document_checks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vaultFileId: text("vault_file_id"),
  kind: text("kind").notNull(),
  band: text("band").notNull(),
  confidence: integer("confidence").notNull().default(0), // 0-100
  fraudScore: integer("fraud_score").notNull().default(0), // 0-100
  campos: jsonb("campos").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** KYC / biometry sessions — no raw video stored beyond retention. */
export const kycSessions = pgTable("kyc_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("mock"), // mock|didit|rekognition
  status: text("status").notNull().default("pending"),
  livenessMode: text("liveness_mode"),
  faceMatchScore: integer("face_match_score"),
  livenessScore: integer("liveness_score"),
  band: text("band").notNull().default("amarela"),
  consentId: integer("consent_id"),
  providerRef: text("provider_ref"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** CNH / trânsito service cases (orientation + dossiê). */
export const cnhCases = pgTable("cnh_cases", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceKind: text("service_kind").notNull(),
  status: text("status").notNull().default("aberto"),
  band: text("band").notNull().default("verde"),
  payload: jsonb("payload").notNull(),
  publicChannels: jsonb("public_channels").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Subscription / package purchases (AbacatePay; Stripe columns kept legacy-null). */
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  abacateCustomerId: text("abacate_customer_id"),
  abacateBillingId: text("abacate_billing_id"),
  abacateCheckoutId: text("abacate_checkout_id"),
  plan: text("plan").notNull(), // 'assinatura' | 'pacote'
  status: text("status").notNull().default("pending"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Webhook event idempotency (AbacatePay). */
export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(), // provider event id
  provider: text("provider").notNull().default("abacatepay"),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  payload: jsonb("payload"),
});

/** Dashboard: debts (Central de Dívidas). */
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ord: integer("ord").notNull().default(0),
  credor: text("credor").notNull(),
  tipo: text("tipo").notNull(),
  valor: text("valor").notNull(),
  detalhe: text("detalhe").notNull(),
  status: text("status").notNull(),
  tagBg: text("tag_bg").notNull(),
  tagColor: text("tag_color").notNull(),
  acao: text("acao").notNull(),
});

/** Dashboard: deadlines (Vigia de prazos). */
export const deadlines = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ord: integer("ord").notNull().default(0),
  dia: text("dia").notNull(),
  mes: text("mes").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  chip: text("chip").notNull(),
  dataBg: text("data_bg").notNull(),
  dataColor: text("data_color").notNull(),
  tagBg: text("tag_bg").notNull(),
  tagColor: text("tag_color").notNull(),
});

/** Dashboard: vault documents (Cofre). */
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ord: integer("ord").notNull().default(0),
  nome: text("nome").notNull(),
  status: text("status").notNull(),
  tagBg: text("tag_bg").notNull(),
  tagColor: text("tag_color").notNull(),
});

/** Dashboard: complaints (Reclamações) — stages stored as JSON for simplicity. */
export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ord: integer("ord").notNull().default(0),
  titulo: text("titulo").notNull(),
  canal: text("canal").notNull(),
  protocolo: text("protocolo").notNull(),
  status: text("status").notNull(),
  tagBg: text("tag_bg").notNull(),
  tagColor: text("tag_color").notNull(),
  etapas: jsonb("etapas").notNull(), // Etapa[]
});

/** Lawyer panel: review queue cases (Botão Fênix). */
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  ord: integer("ord").notNull().default(0),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  aprovado: boolean("aprovado").notNull().default(false),
  nome: text("nome").notNull(),
  materia: text("materia").notNull(),
  prazo: text("prazo").notNull(),
  chip: text("chip").notNull(),
  chipBg: text("chip_bg").notNull(),
  chipColor: text("chip_color").notNull(),
  titulo: text("titulo").notNull(),
  sub: text("sub").notNull(),
  prazoChip: text("prazo_chip").notNull(),
  resumo: text("resumo").notNull(),
  minutaTitulo: text("minuta_titulo").notNull(),
  minuta: text("minuta").notNull(),
});
