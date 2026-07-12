-- Onda KYC: perfil, consentimentos, cofre, checagens, KYC, CNH, pagamentos AbacatePay

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpf" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'nao_verificado' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_step" text DEFAULT 'dados' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "consents" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "purpose" text NOT NULL,
  "granted" boolean NOT NULL,
  "term_version" text NOT NULL,
  "ip" text,
  "user_agent" text,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "vault_files" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "mime" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "storage_key" text NOT NULL,
  "storage_backend" text DEFAULT 'local' NOT NULL,
  "encrypted" boolean DEFAULT true NOT NULL,
  "original_name_hash" text,
  "status" text DEFAULT 'uploaded' NOT NULL,
  "retention_until" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "vault_access_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "vault_file_id" text,
  "actor" text NOT NULL,
  "action" text NOT NULL,
  "ip" text,
  "meta" jsonb,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "document_checks" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "vault_file_id" text,
  "kind" text NOT NULL,
  "band" text NOT NULL,
  "confidence" integer DEFAULT 0 NOT NULL,
  "fraud_score" integer DEFAULT 0 NOT NULL,
  "campos" jsonb NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "kyc_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider" text DEFAULT 'mock' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "liveness_mode" text,
  "face_match_score" integer,
  "liveness_score" integer,
  "band" text DEFAULT 'amarela' NOT NULL,
  "consent_id" integer,
  "provider_ref" text,
  "expires_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cnh_cases" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "service_kind" text NOT NULL,
  "status" text DEFAULT 'aberto' NOT NULL,
  "band" text DEFAULT 'verde' NOT NULL,
  "payload" jsonb NOT NULL,
  "public_channels" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "abacate_customer_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "abacate_billing_id" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "abacate_checkout_id" text;

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text DEFAULT 'abacatepay' NOT NULL,
  "type" text NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "payload" jsonb
);
