/**
 * Smoke tests for all Fênix agents (pure functions, no network).
 * Run: npm run test:agents
 */
import { runFarol } from "../lib/agents/farol";
import { runAtlas, parseBRL } from "../lib/agents/atlas";
import { runIris } from "../lib/agents/iris";
import {
  runDocCheck,
  isValidCpf,
  isValidCnpj,
  computeFraudScore,
} from "../lib/agents/doccheck";
import { mockSampleForHint } from "../lib/ocr/provider";
import { runAcordo } from "../lib/agents/acordo";
import { runOficina } from "../lib/agents/oficina";
import { runPonte } from "../lib/agents/ponte";
import { runVigia } from "../lib/agents/vigia";
import { runAurora } from "../lib/agents/aurora";
import { runDefensor } from "../lib/agents/defensor";
import { runSuperendividamento } from "../lib/agents/superendividamento";
import { runEscudo } from "../lib/agents/escudo";
import { runCnh } from "../lib/agents/cnh";
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

// DocCheck + CPF/CNPJ validators
assert(isValidCpf("529.982.247-25") === true, "isValidCpf dígitos ok");
assert(isValidCpf("111.111.111-11") === false, "isValidCpf rejeita repetidos");
assert(isValidCnpj("11.444.777/0001-61") === true, "isValidCnpj dígitos ok");
assert(isValidCnpj("00.000.000/0000-00") === false, "isValidCnpj rejeita zeros");

const cnhText = mockSampleForHint("cnh-marina.pdf");
const dcCnh = runDocCheck({
  text: cnhText,
  kind: "cnh",
  cadastro: {
    nome: "Marina Oliveira Santos",
    cpf: "529.982.247-25",
    dataNascimento: "15/03/1990",
  },
  fileName: "cnh-marina.pdf",
});
assert(dcCnh.campos.numeroRegistro?.value != null, "DocCheck CNH extrai registro");
assert(dcCnh.campos.categoria?.value === "B", "DocCheck CNH categoria B");
assert(dcCnh.crossCheck.cpfMatch === true, "DocCheck CNH cpfMatch");
assert(dcCnh.crossCheck.nomeMatch === true, "DocCheck CNH nomeMatch");
assert(dcCnh.fraudScore < 40, "DocCheck CNH fraudScore baixo");
assert(dcCnh.band === "verde" || dcCnh.band === "amarela", "DocCheck CNH não vermelha");
assert(dcCnh.audit.agent === "doccheck", "DocCheck audit agent");
assert(dcCnh.publicChannels.some((c) => /Receita|gov\.br|DETRAN/i.test(c)), "DocCheck canais públicos");

const dcMismatch = runDocCheck({
  text: cnhText,
  kind: "cnh",
  cadastro: { nome: "Fulano de Tal Completamente Diferente", cpf: "390.533.447-05" },
});
assert(dcMismatch.crossCheck.cpfMatch === false, "DocCheck mismatch CPF");
assert(dcMismatch.band === "vermelha" || dcMismatch.fraudScore >= 30, "DocCheck mismatch → risco");
assert(dcMismatch.audit.requiresLawyerReview === true, "DocCheck mismatch → advogado");

const dcBadCpf = runDocCheck({
  text: "NOME: TESTE\nCPF: 111.111.111-11",
  kind: "cpf",
});
assert(dcBadCpf.fraudScore >= 40, "DocCheck CPF inválido eleva fraudScore");
assert(dcBadCpf.band !== "verde", "DocCheck CPF inválido não é verde");
assert(
  computeFraudScore({
    text: "x",
    campos: {},
    crossCheck: { nomeMatch: null, cpfMatch: null, dataMatch: null, divergences: [] },
    kind: "cpf",
  }) >= 30,
  "computeFraudScore texto curto",
);

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

// CNH / Trânsito
const cnhPerda = runCnh({ service: "perda_roubo_extravio", uf: "SP" });
assert(cnhPerda.band === "verde", "CNH perda → verde");
assert(cnhPerda.publicChannels.some((c) => /DETRAN/i.test(c)), "CNH cita DETRAN");
assert(cnhPerda.publicChannels.some((c) => /gov\.br/i.test(c)), "CNH cita gov.br");
assert(cnhPerda.detranLinks.some((l) => l.url.includes("detran.sp.gov.br")), "CNH link DETRAN-SP");
assert(cnhPerda.checklist.length >= 3, "CNH checklist perda");

const cnhRec = runCnh({
  service: "recurso_multa",
  uf: "SP",
  relato: "Radar em local sem sinalização clara",
  multa: {
    autoInfracao: "A999",
    dataNotificacao: "01/03/2026",
    etapa: "defesa_previa",
    orgao: "DETRAN-SP",
  },
});
assert(cnhRec.band === "amarela", "CNH recurso → amarela");
assert(cnhRec.minutaSugerida?.requiresFenixButton === true, "CNH minuta exige Botão Fênix");
assert(
  /REVISÃO|Botão Fênix|ADVOGADO/i.test(cnhRec.minutaSugerida?.corpo ?? ""),
  "CNH minuta marca revisão advogado",
);
assert(cnhRec.audit.requiresLawyerReview === true, "CNH recurso revisão jurídica");

const cnhPontos = runCnh({ service: "consulta_pontos", uf: "RJ", pontos: 42 });
assert(cnhPontos.band === "vermelha", "CNH pontos altos → vermelha");

const cnhSusp = runCnh({
  service: "suspensao_cassacao",
  uf: "SP",
  relato: "Recebi notificação de processo de cassação com prazo",
});
assert(cnhSusp.band === "vermelha", "CNH cassação → vermelha");
assert(cnhSusp.documentosNecessarios.length >= 3, "CNH suspensão dossiê");

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
