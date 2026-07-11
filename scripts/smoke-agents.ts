/**
 * Smoke tests for all Fênix agents (pure functions, no network).
 * Run: npm run test:agents
 */
import { runFarol } from "../lib/agents/farol";
import { runAtlas, parseBRL } from "../lib/agents/atlas";
import { runIris } from "../lib/agents/iris";
import { runAcordo } from "../lib/agents/acordo";
import { runOficina } from "../lib/agents/oficina";
import { runPonte } from "../lib/agents/ponte";
import { runVigia } from "../lib/agents/vigia";
import { runAurora } from "../lib/agents/aurora";
import { runDefensor } from "../lib/agents/defensor";
import { runSuperendividamento } from "../lib/agents/superendividamento";
import { runEscudo } from "../lib/agents/escudo";
import { applyFenixButton, listFenixDecisions } from "../lib/fenix-button";
import { appendAudit, listAudit, clearAuditForTests } from "../lib/audit";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

clearAuditForTests();

// Farol
const f1 = runFarol({
  selectedLabels: ["Recebi oficial de justiça, mandado ou citação", "Existe prazo para hoje ou os próximos dias"],
});
assert(f1.humanQueue === true, "Farol citação → fila humana");
assert(f1.band === "vermelha" || f1.band === "amarela", "Farol citação → faixa amarela/vermelha");
assert(f1.priorityScore >= 50, "Farol citação → score alto");
assert(f1.publicChannels.length > 0, "Farol lista canais públicos");

const f2 = runFarol({ freeText: "estou bem, só quero organizar minhas contas" });
assert(f2.band === "verde" || f2.priorityScore < 35, "Farol sem risco → baixa prioridade");

// Atlas
assert(parseBRL("R$ 18.900") === 18900, "parseBRL milhar BR");
const debts = [
  { credor: "Banco Azul", valor: 18900, status: "Negociável" },
  { credor: "FinanCred", valor: 12400, status: "Contestável" },
  { credor: "Loja Meridiano", valor: 8300, status: "Em juízo" },
];
const a = runAtlas({
  debts,
  rendaMensal: 3200,
  despesasEssenciais: 2350,
});
assert(a.totalDivida === 39600, "Atlas total");
assert(a.disponivelMes === 850, "Atlas disponível");
assert(a.porCredor.length === 3, "Atlas donut slices");
assert(a.controle90d > 0 && a.controle90d <= 100, "Atlas gauge 0–100");
assert(a.audit.agent === "atlas", "Atlas audit trail");

// Íris
const iris = runIris({
  text: `
    CITAÇÃO
    Autos nº 0045678-21.2026.8.26.0405
    2ª Vara Cível de Osasco/SP
    Valor da causa: R$ 8.300,00
    Data: 12/08/2026
  `,
  fileName: "citacao.txt",
});
assert(iris.extracted.kind === "citacao", "Íris classifica citação");
assert(iris.extracted.numeroProcesso.provenance === "confirmed", "Íris CNJ confirmed");
assert((iris.extracted.valores.length ?? 0) >= 1, "Íris extrai valor");
assert(iris.band === "amarela", "Íris citação → amarela");
assert(!iris.summary.toLowerCase().includes("vamos ganhar"), "Íris sem promessa");

// Acordo
const ac = runAcordo({ debts, disponivelMes: 850, meses: 12 });
assert(ac.propostas.length === 3, "Acordo 3 propostas");
assert(ac.propostas.some((p) => p.recomendacao === "contestar_antes"), "Acordo contesta contestável");
assert(ac.propostas.some((p) => p.recomendacao === "aguardar_advogado"), "Acordo juízo → advogado");
assert(ac.propostas[0].cartaRascunho.includes("não reconhece"), "Carta com ressalva");

// Oficina
const of = runOficina({
  kind: "contestacao_cobranca",
  nomeUsuario: "Marina L.",
  fatos: "Cobrança indevida",
  numeroProcesso: "0045678-21.2026.8.26.0405",
  comarca: "2ª Vara Cível",
});
assert(of.band === "amarela", "Oficina sempre amarela");
assert(of.audit.requiresLawyerReview === true, "Oficina exige advogado");
assert(of.minuta.includes("Botão Fênix") || of.minuta.includes("REVISÃO"), "Oficina marca revisão");
assert(!/STJ.*REsp.*inventad/i.test(of.minuta), "Oficina sem juris fake");

// Ponte
const po = runPonte({ tema: "inss_beneficio" });
assert(po.passos.length >= 2, "Ponte passos INSS");
assert(po.passos.some((p) => p.gratuito), "Ponte marca gratuito");
assert(po.summary.includes("senha") === false || po.summary.includes("Nunca"), "Ponte não pede senha");

const po2 = runPonte({ freeText: "meu mei esta com das atrasado" });
assert(po2.tema === "mei_das", "Ponte detecta MEI");

// Vigia
const vg = runVigia({
  prazos: [
    { titulo: "Defesa Meridiano", dia: "12", mes: "ago", chip: "Crítico" },
    { titulo: "Parcela condomínio", dia: "20", mes: "ago", chip: "Agendado" },
  ],
  hoje: new Date(2026, 7, 10), // 10 ago 2026
});
assert(vg.alertas.length === 2, "Vigia 2 alertas");
assert(vg.criticos >= 1, "Vigia tem crítico");

// Aurora
const au = runAurora({ controleAtual: 48, diasDesdeInicio: 30 });
assert(au.controleProjetado90d >= au.controleAtual, "Aurora projeta >= atual (caso base)");
assert(au.marcos.length === 4, "Aurora 4 marcos");
assert(!au.narrativa.toLowerCase().includes("garantimos"), "Aurora sem garantia");

// Defensor
const de = runDefensor({
  empresa: "FinanCred",
  problema: "cobrança indevida",
  jaFez: ["sac"],
});
assert(de.proximoDegrau.toLowerCase().includes("ouvidoria"), "Defensor próximo ouvidoria");
assert(de.rascunhoReclamacao.includes("FinanCred"), "Defensor rascunho");
assert(de.escada.some((e) => e.id === "consumidor_gov" && e.canalPublico), "Defensor consumidor.gov");

// Superendividamento
const su = runSuperendividamento({
  debts,
  rendaMensal: 3200,
  despesasEssenciais: 2350,
  temProcessoCobranca: true,
});
assert(su.quadro.length === 3, "Super quadro credores");
assert(su.dossieChecklist.length >= 5, "Super checklist dossiê");
assert(su.audit.requiresLawyerReview === true, "Super revisão jurídica");
assert(su.summary.includes("14.181"), "Super cita lei referência");

// Escudo
const es = runEscudo({
  textoContrato: "Contrato com seguro prestamista obrigatório e confissão de dívida em título executivo.",
});
assert(es.alertas.length >= 2, "Escudo detecta cláusulas");
assert(es.scoreRisco > 20, "Escudo score risco");

// Botão Fênix + audit
const dec = applyFenixButton({
  caseId: "case-test",
  caseTitle: "Defesa teste",
  action: "aprovar",
  actorName: "Dr. Leandro Giannasi",
  actorOab: "OAB/SP 312.456",
});
assert(dec.canProtocol === true, "Fênix aprovar → protocolar");
assert(listFenixDecisions("case-test").length >= 1, "Fênix lista decisões");

appendAudit({ actor: "test", agent: "smoke", action: "ping" });
assert(listAudit(5).length >= 1, "Audit trail append");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll agent smoke tests passed.");
