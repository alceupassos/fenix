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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Stripe subscription / package purchases tied to a user. */
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  plan: text("plan").notNull(), // 'assinatura' | 'pacote'
  status: text("status").notNull().default("pending"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
