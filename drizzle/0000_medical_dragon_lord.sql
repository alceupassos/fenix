CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"user_id" text,
	"aprovado" boolean DEFAULT false NOT NULL,
	"nome" text NOT NULL,
	"materia" text NOT NULL,
	"prazo" text NOT NULL,
	"chip" text NOT NULL,
	"chip_bg" text NOT NULL,
	"chip_color" text NOT NULL,
	"titulo" text NOT NULL,
	"sub" text NOT NULL,
	"prazo_chip" text NOT NULL,
	"resumo" text NOT NULL,
	"minuta_titulo" text NOT NULL,
	"minuta" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"titulo" text NOT NULL,
	"canal" text NOT NULL,
	"protocolo" text NOT NULL,
	"status" text NOT NULL,
	"tag_bg" text NOT NULL,
	"tag_color" text NOT NULL,
	"etapas" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"dia" text NOT NULL,
	"mes" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"chip" text NOT NULL,
	"data_bg" text NOT NULL,
	"data_color" text NOT NULL,
	"tag_bg" text NOT NULL,
	"tag_color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"credor" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" text NOT NULL,
	"detalhe" text NOT NULL,
	"status" text NOT NULL,
	"tag_bg" text NOT NULL,
	"tag_color" text NOT NULL,
	"acao" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ord" integer DEFAULT 0 NOT NULL,
	"nome" text NOT NULL,
	"status" text NOT NULL,
	"tag_bg" text NOT NULL,
	"tag_color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_checkout_session_id" text,
	"plan" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"oab" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;