/**
 * Seeds the `fenix` database with the demo users and Marina's dashboard data
 * (the same content the UI shipped as mocks). Run with FENIX_DATABASE_URL set:
 *   FENIX_DATABASE_URL=postgres://... npx tsx lib/db/seed.ts
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { DEMO_USERS } from "../users";
import {
  dividas,
  prazos,
  docs,
  reclamacoes,
  casosData,
} from "../data";

async function main() {
  if (!db) throw new Error("FENIX_DATABASE_URL não definido — sem conexão com o banco.");

  // Users (idempotent). password_hash stores the plain demo password for now.
  for (const u of DEMO_USERS) {
    await db
      .insert(schema.users)
      .values({ id: u.id, name: u.name, email: u.email, passwordHash: u.password, role: u.role, oab: u.oab })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: { name: u.name, email: u.email, passwordHash: u.password, role: u.role, oab: u.oab },
      });
  }

  const marina = "u_marina";

  // Reset Marina's dashboard rows, then insert fresh.
  await db.delete(schema.debts).where(eq(schema.debts.userId, marina));
  await db.delete(schema.deadlines).where(eq(schema.deadlines.userId, marina));
  await db.delete(schema.documents).where(eq(schema.documents.userId, marina));
  await db.delete(schema.complaints).where(eq(schema.complaints.userId, marina));

  await db.insert(schema.debts).values(
    dividas.map((d, i) => ({
      userId: marina, ord: i, credor: d.credor, tipo: d.tipo, valor: d.valor, detalhe: d.detalhe,
      status: d.status, tagBg: d.tagBg, tagColor: d.tagColor, acao: d.acao,
    }))
  );

  await db.insert(schema.deadlines).values(
    prazos.map((p, i) => ({
      userId: marina, ord: i, dia: p.dia, mes: p.mes, titulo: p.titulo, descricao: p.desc, chip: p.chip,
      dataBg: p.dataBg, dataColor: p.dataColor, tagBg: p.tagBg, tagColor: p.tagColor,
    }))
  );

  await db.insert(schema.documents).values(
    docs.map((dc, i) => ({
      userId: marina, ord: i, nome: dc.nome, status: dc.status, tagBg: dc.tagBg, tagColor: dc.tagColor,
    }))
  );

  await db.insert(schema.complaints).values(
    reclamacoes.map((rc, i) => ({
      userId: marina, ord: i, titulo: rc.titulo, canal: rc.canal, protocolo: rc.protocolo, status: rc.status,
      tagBg: rc.tagBg, tagColor: rc.tagColor, etapas: rc.etapas,
    }))
  );

  // Lawyer review queue (global).
  await db.delete(schema.cases);
  await db.insert(schema.cases).values(
    casosData.map((c, i) => ({
      ord: i, nome: c.nome, materia: c.materia, prazo: c.prazo, chip: c.chip, chipBg: c.chipBg, chipColor: c.chipColor,
      titulo: c.titulo, sub: c.sub, prazoChip: c.prazoChip, resumo: c.resumo, minutaTitulo: c.minutaTitulo, minuta: c.minuta,
    }))
  );

  // Report counts.
  const counts = {
    users: (await db.select().from(schema.users)).length,
    debts: (await db.select().from(schema.debts)).length,
    deadlines: (await db.select().from(schema.deadlines)).length,
    documents: (await db.select().from(schema.documents)).length,
    complaints: (await db.select().from(schema.complaints)).length,
    cases: (await db.select().from(schema.cases)).length,
  };
  console.log("SEED_OK", JSON.stringify(counts));
  process.exit(0);
}

main().catch((e) => {
  console.error("SEED_FAIL", e);
  process.exit(1);
});
