import type { IconName } from "@/components/Icon";

/* ================================================================
   Mock content ported verbatim from the prototype
   (Sociedade Fênix.dc.html → renderVals). Portuguese copy, values,
   colors and legal disclaimers are kept exactly.
   ================================================================ */

// ---- shared color helpers (situação icon tints) ----
const teal = { iconBg: "#E6F7F6", iconColor: "#0F8B8B" };
const orange = { iconBg: "#FDEDE7", iconColor: "#D95B33" };
const navy = { iconBg: "#EAF0F9", iconColor: "#2B4B8F" };

export type Situacao = {
  icon: IconName;
  titulo: string;
  desc: string;
  iconBg: string;
  iconColor: string;
};

export const situacoes: Situacao[] = (
  [
    ["wallet", "Estou cheio de dívidas", "Cartão, empréstimo, cheque especial, contas atrasadas — vamos organizar tudo.", teal],
    ["file", "Recebi uma cobrança ou processo", "Carta do fórum, citação, oficial de justiça ou ameaça de protesto.", orange],
    ["lock", "Meu dinheiro foi bloqueado", "Conta, salário, aposentadoria ou benefício retido ou penhorado.", orange],
    ["bank", "Problema com banco ou empresa", "Cobrança indevida, tarifa não autorizada, seguro embutido, cancelamento ignorado.", navy],
    ["gov", "Problema com o governo", "Receita, dívida ativa, multas, CPF, prefeitura — nós encontramos o caminho.", navy],
    ["shield", "Benefício negado ou suspenso", "INSS, BPC, auxílio, aposentadoria ou pensão que parou de cair.", teal],
    ["home", "Posso perder casa, carro ou bens", "Despejo, busca e apreensão, leilão ou bloqueio de patrimônio.", orange],
    ["users", "Pensão, família ou herança", "Pensão alimentícia, dívidas familiares, partilha e inventário travados.", teal],
    ["id", "CPF, imposto ou MEI com problema", "Pendência no CPF, malha fina, DAS atrasado, MEI para regularizar.", navy],
    ["alert", "Fui vítima de golpe ou fraude", "Empréstimo que não fiz, Pix fraudado, dívida criada por terceiro.", orange],
    ["heart", "Dívida de saúde ou escola", "Mensalidades, plano de saúde, tratamentos e negociações sensíveis.", teal],
    ["help", "Não sei por onde começar", "Sem problema. Conte do seu jeito — a gente organiza com você.", navy],
  ] as [IconName, string, string, { iconBg: string; iconColor: string }][]
).map(([icon, titulo, desc, c]) => ({ icon, titulo, desc, ...c }));

export type Passo = { n: string; bg: string; titulo: string; desc: string };
export const passos: Passo[] = [
  { n: "1", bg: "#12A5A5", titulo: "Você conta", desc: "Com suas palavras — texto, áudio, foto ou documento. Sem juridiquês, sem formulário." },
  { n: "2", bg: "#12A5A5", titulo: "Você entende", desc: "Mostramos o que está acontecendo, o que é urgente, o que falta e quais caminhos existem." },
  { n: "3", bg: "#12A5A5", titulo: "Você age", desc: "Preparamos reclamações, negociações, pedidos e documentos. Nada sai sem sua autorização." },
  { n: "4", bg: "#EE6E45", titulo: "Advogado quando necessário", desc: "O que exige responsabilidade jurídica é analisado e aprovado por um profissional habilitado." },
  { n: "5", bg: "#EE6E45", titulo: "Você acompanha", desc: "Prazos, respostas, parcelas e próximos passos organizados em um único lugar." },
];

export type Agente = { nome: string; papel: string };
export const agentes: Agente[] = [
  { nome: "Clara", papel: "acolhimento" },
  { nome: "Farol", papel: "urgências" },
  { nome: "Atlas", papel: "finanças" },
  { nome: "Íris", papel: "documentos" },
  { nome: "Ponte", papel: "governo" },
  { nome: "Acordo", papel: "negociação" },
  { nome: "Vigia", papel: "prazos" },
  { nome: "Oficina", papel: "documentos jurídicos" },
  { nome: "Aurora", papel: "acompanhamento" },
];

export type SegCard = { icon: IconName; titulo: string; desc: string };
export const segCards: SegCard[] = [
  { icon: "lock", titulo: "Criptografia e 2 fatores", desc: "Documentos em cofre digital, acesso registrado e autenticação em duas etapas." },
  { icon: "shield", titulo: "Seus dados não são vendidos", desc: "Não recebemos pagamento de credores para direcionar você a um acordo. Nunca." },
  { icon: "scale2", titulo: "Advogado responsável", desc: "Cada medida jurídica traz o nome do profissional que a aprovou, com trilha de auditoria." },
  { icon: "check", titulo: "Pagamento seguro via Stripe", desc: "Cobrança transparente, recibo na hora e cancelamento quando você quiser." },
];

const btnGrad = "linear-gradient(135deg, #F5A34F, #EE6E45)";
export type Plano = {
  kicker: string;
  preco: string;
  periodo: string;
  destaque: boolean;
  desc: string;
  cta: string;
  action: "clara" | "painel";
  checkout?: "assinatura" | "pacote";
  btnBg: string;
  btnColor: string;
  btnShadow: string;
  border: string;
  shadow: string;
  nota: string;
};
export const planos: Plano[] = [
  {
    kicker: "Porta de entrada", preco: "Grátis", periodo: "", destaque: false,
    desc: "Conversa com a Clara, triagem de urgência, diagnóstico simplificado e indicação de canais públicos gratuitos.",
    cta: "Começar agora", action: "clara", btnBg: "#F0F4F9", btnColor: "#13233F", btnShadow: "none",
    border: "1px solid rgba(19,35,63,.08)", shadow: "0 10px 30px rgba(16,42,84,.05)", nota: "Sem cartão de crédito",
  },
  {
    kicker: "Assinatura Fênix", preco: "R$ 99", periodo: "/mês", destaque: true, checkout: "assinatura",
    desc: "Mapa de Recomeço completo, cofre de documentos, Vigia de prazos, agentes de negociação, reclamações acompanhadas e suporte pelo WhatsApp.",
    cta: "Assinar com Stripe", action: "painel", btnBg: btnGrad, btnColor: "#fff", btnShadow: "0 10px 26px rgba(238,110,69,.4)",
    border: "2px solid #EE6E45", shadow: "0 24px 54px rgba(238,110,69,.16)", nota: "Pagamento seguro via Stripe · cancele quando quiser",
  },
  {
    kicker: "Pacotes de organização", preco: "R$ 149", periodo: " por pacote", destaque: false,
    desc: "Dossiê de superendividamento, central de negociação, organização para INSS, dívida ativa, MEI ou dossiê antifraude.",
    cta: "Ver qual eu preciso", action: "clara", btnBg: "#F0F4F9", btnColor: "#13233F", btnShadow: "none",
    border: "1px solid rgba(19,35,63,.08)", shadow: "0 10px 30px rgba(16,42,84,.05)", nota: "Pagamento único via Stripe",
  },
];

// ---- Clara chat script (5 steps) ----
export type ScriptStep = { asks: string[]; replies: string[] };
export const claraScript: ScriptStep[] = [
  {
    asks: ["Oi! Eu sou a Clara, assistente digital da Sociedade Fênix. Não sou humana — e quando uma decisão jurídica for necessária, um advogado analisará o seu caso.\n\nVou te fazer poucas perguntas, uma de cada vez. Primeiro: o que está tirando o seu sono?"],
    replies: ["Estou cheio de dívidas", "Recebi uma cobrança ou processo", "Minha conta foi bloqueada", "Problema com pensão ou família", "Não sei por onde começar"],
  },
  {
    asks: ["Entendi. Isso pesa — e você fez a coisa certa em contar.\n\nVamos organizar juntos, um passo de cada vez. Você recebeu alguma carta, notificação ou documento do fórum?"],
    replies: ["Sim, recebi uma carta", "Não recebi nada", "Não tenho certeza"],
  },
  {
    asks: ["Certo, anotei. Se encontrar o documento depois, é só fotografar e me enviar por aqui.\n\nAlguma parte do seu salário, aposentadoria ou benefício está sendo descontada ou bloqueada?"],
    replies: ["Sim, estão descontando", "Não", "Meu banco bloqueou a conta"],
  },
  {
    asks: ["Obrigada por me contar. Última pergunta por agora: hoje você consegue pagar o básico — comida, água, luz?"],
    replies: ["Sim, com aperto", "Não estou conseguindo"],
  },
  {
    asks: ["Obrigada por confiar em mim. Com o que você contou, montei um primeiro mapa da sua situação:\n\n1. Uma dívida que pode ser negociada com desconto\n2. Uma cobrança com sinais de erro, que merece contestação\n3. Um prazo que precisa de atenção ainda esta semana\n\nNada será feito sem a sua autorização — e tudo que for jurídico passa por um advogado antes. Seu Mapa de Recomeço está pronto."],
    replies: [],
  },
];

export const claraUrgenteFirst =
  "Recebi seu pedido de atendimento prioritário. Um atendente humano foi avisado agora e vai entrar nesta conversa.\n\nEnquanto isso, me conte: o que está acontecendo? Se houver uma data ou prazo escrito em algum documento, me diga qual é.";

// ---- Ajuda urgente ----
export const urgLabels: string[] = [
  "Existe prazo para hoje ou os próximos dias",
  "Recebi oficial de justiça, mandado ou citação",
  "Minha conta ou meu salário foi bloqueado",
  "Risco de despejo, busca e apreensão ou leilão",
  "Risco de corte de água ou energia",
  "Pensão, guarda ou conflito familiar grave",
  "Risco à saúde, violência ou prisão",
];

// ---- Painel do usuário ----
export type NavItem = { id: PainelTab; label: string; icon: IconName; badge: string };
export type PainelTab = "visao" | "dividas" | "prazos" | "cofre" | "recl";
export const painelNav: NavItem[] = [
  { id: "visao", label: "Visão geral", icon: "grid", badge: "" },
  { id: "dividas", label: "Minhas dívidas", icon: "wallet", badge: "5" },
  { id: "prazos", label: "Prazos · Vigia", icon: "bell", badge: "2" },
  { id: "cofre", label: "Cofre de documentos", icon: "vault", badge: "" },
  { id: "recl", label: "Reclamações", icon: "msg", badge: "" },
];

export const painelTitulos: Record<PainelTab, [string, string]> = {
  visao: ["Bom dia, {nome}.", "Este é o seu Mapa de Recomeço — um passo de cada vez."],
  dividas: ["Central de Dívidas", "Tudo que você deve, organizado por prioridade — com o que dá para negociar."],
  prazos: ["Vigia de prazos", "Nenhuma data importante passa em branco."],
  cofre: ["Cofre de documentos", "Seus documentos protegidos e prontos quando você precisar."],
  recl: ["Reclamações em andamento", "Cada protocolo acompanhado até a resposta final."],
};

export type Resumo = { label: string; valor: string; nota: string; color: string };
export const resumo: Resumo[] = [
  { label: "Total devido", valor: "R$ 48.230", nota: "5 credores identificados", color: "#13233F" },
  { label: "Valor contestável", valor: "R$ 12.400", nota: "consignado com sinais de fraude", color: "#D95B33" },
  { label: "Disponível por mês", valor: "R$ 850", nota: "após despesas essenciais protegidas", color: "#0F8B8B" },
  { label: "Prazos ativos", valor: "3", nota: "próximo em 5 dias", color: "#13233F" },
];

export type Problema = {
  tag: string; cor: string; tagBg: string; tagColor: string;
  titulo: string; desc: string; acao: string;
};
export const problemas: Problema[] = [
  { tag: "Negociável", cor: "#12A5A5", tagBg: "#E6F7F6", tagColor: "#0C6E6E", titulo: "Cartão Banco Azul — R$ 18.900", desc: "Juros altos acumulados. Há oferta de acordo com 62% de desconto à vista ou parcelas que cabem no seu orçamento.", acao: "Ver simulação de acordo" },
  { tag: "Contestável", cor: "#EE6E45", tagBg: "#FDEDE7", tagColor: "#C2451F", titulo: "Consignado FinanCred — R$ 12.400", desc: "Você não reconhece este contrato. A Íris encontrou inconsistências na assinatura e na data. Preparamos a contestação para revisão do advogado.", acao: "Acompanhar contestação" },
  { tag: "Prazo aberto", cor: "#E2574C", tagBg: "#FDEDE7", tagColor: "#C2451F", titulo: "Ação de cobrança — Loja Meridiano", desc: "Existe um processo com prazo de defesa até 12/08. A minuta está pronta e aguarda a aprovação da advogada responsável.", acao: "Ver andamento" },
];

export type PlanoEtapa = {
  quando: string; quandoColor: string; icon: IconName; dotBg: string; dotColor: string;
  linha: boolean; titulo: string; desc: string;
};
export const planoEtapas: PlanoEtapa[] = [
  { quando: "Hoje", quandoColor: "#C2451F", icon: "alert", dotBg: "#FDEDE7", dotColor: "#E2574C", linha: true, titulo: "Enviar contracheque dos últimos 3 meses", desc: "A Íris precisa dele para comprovar que o desconto do consignado ultrapassa o limite legal." },
  { quando: "Esta semana", quandoColor: "#9A5B1F", icon: "calendar", dotBg: "#FFF3E6", dotColor: "#D98324", linha: true, titulo: "Responder proposta do Banco Azul", desc: "A Acordo preparou uma contraproposta dentro do seu orçamento de R$ 850/mês. Você só confirma." },
  { quando: "Este mês", quandoColor: "#0C6E6E", icon: "users", dotBg: "#E6F7F6", dotColor: "#12A5A5", linha: true, titulo: "Audiência de conciliação — 26/08", desc: "Você não vai sozinho: receberá um roteiro simples e o advogado estará presente." },
  { quando: "Depois da estabilização", quandoColor: "#2B4B8F", icon: "flag", dotBg: "#EAF0F9", dotColor: "#2B4B8F", linha: false, titulo: "Plano de reconstrução", desc: "Orçamento, reserva mínima, recuperação do crédito e proteção contra novas dívidas." },
];

export type Divida = {
  credor: string; tipo: string; valor: string; detalhe: string;
  status: string; tagBg: string; tagColor: string; acao: string;
};
export const dividas: Divida[] = [
  { credor: "Banco Azul", tipo: "Cartão de crédito · 14 meses em atraso", valor: "R$ 18.900", detalhe: "oferta: R$ 7.180 à vista", status: "Negociável", tagBg: "#E6F7F6", tagColor: "#0C6E6E", acao: "Simular acordo" },
  { credor: "FinanCred", tipo: "Consignado · não reconhecido", valor: "R$ 12.400", detalhe: "contestação em revisão jurídica", status: "Contestável", tagBg: "#FDEDE7", tagColor: "#C2451F", acao: "Acompanhar" },
  { credor: "Loja Meridiano", tipo: "Crediário · em processo judicial", valor: "R$ 8.300", detalhe: "prazo de defesa 12/08", status: "Em juízo", tagBg: "#FDEDE7", tagColor: "#C2451F", acao: "Ver processo" },
  { credor: "Condomínio Jardim das Flores", tipo: "Cotas condominiais · 6 meses", valor: "R$ 5.430", detalhe: "proposta de parcelamento pronta", status: "Negociável", tagBg: "#E6F7F6", tagColor: "#0C6E6E", acao: "Enviar proposta" },
  { credor: "Energia Luz+ ", tipo: "Conta de consumo · essencial", valor: "R$ 3.200", detalhe: "prioridade: evitar corte", status: "Prioritária", tagBg: "#FFF3E6", tagColor: "#9A5B1F", acao: "Negociar" },
];

export type Prazo = {
  dia: string; mes: string; titulo: string; desc: string; chip: string;
  dataBg: string; dataColor: string; tagBg: string; tagColor: string;
};
export const prazos: Prazo[] = [
  { dia: "12", mes: "ago", titulo: "Prazo de defesa — Ação Loja Meridiano", desc: "Minuta pronta, aguardando aprovação da advogada.", chip: "Crítico", dataBg: "#FDEDE7", dataColor: "#C2451F", tagBg: "#FDEDE7", tagColor: "#C2451F" },
  { dia: "15", mes: "ago", titulo: "Resposta do Consumidor.gov.br — FinanCred", desc: "A empresa tem até esta data para responder sua reclamação.", chip: "Acompanhando", dataBg: "#E6F7F6", dataColor: "#0C6E6E", tagBg: "#E6F7F6", tagColor: "#0C6E6E" },
  { dia: "20", mes: "ago", titulo: "Parcela 1/12 — acordo Condomínio", desc: "R$ 452,50 · lembrete programado 3 dias antes.", chip: "Agendado", dataBg: "#EAF0F9", dataColor: "#2B4B8F", tagBg: "#EAF0F9", tagColor: "#2B4B8F" },
  { dia: "26", mes: "ago", titulo: "Audiência de conciliação — Banco Azul", desc: "Com roteiro preparado e advogado presente.", chip: "Preparação", dataBg: "#FFF3E6", dataColor: "#9A5B1F", tagBg: "#FFF3E6", tagColor: "#9A5B1F" },
];

export type Doc = { nome: string; status: string; tagBg: string; tagColor: string };
export const docs: Doc[] = [
  { nome: "RG e CPF", status: "Verificado", tagBg: "#E6F7F6", tagColor: "#0C6E6E" },
  { nome: "Comprovante de renda (3 meses)", status: "Falta 1 mês", tagBg: "#FFF3E6", tagColor: "#9A5B1F" },
  { nome: "Contrato do cartão Banco Azul", status: "Verificado", tagBg: "#E6F7F6", tagColor: "#0C6E6E" },
  { nome: "Citação — Loja Meridiano", status: "Lido pela Íris", tagBg: "#E6F7F6", tagColor: "#0C6E6E" },
  { nome: "Extratos bancários", status: "Verificado", tagBg: "#E6F7F6", tagColor: "#0C6E6E" },
  { nome: "Comprovante de endereço", status: "Pendente", tagBg: "#FDEDE7", tagColor: "#C2451F" },
];

const barOn = "linear-gradient(90deg, #12A5A5, #4ECDC4)";
const barOff = "rgba(19,35,63,.08)";
export type Etapa = { nome: string; data: string; barra: string; cor: string };
export type Reclamacao = {
  titulo: string; canal: string; protocolo: string; status: string;
  tagBg: string; tagColor: string; etapas: Etapa[];
};
export const reclamacoes: Reclamacao[] = [
  {
    titulo: "Consignado não contratado — FinanCred", canal: "Consumidor.gov.br", protocolo: "2026.07.884.312",
    status: "Aguardando empresa", tagBg: "#FFF3E6", tagColor: "#9A5B1F",
    etapas: [
      { nome: "Reclamação enviada", data: "28/07", barra: barOn, cor: "#0C6E6E" },
      { nome: "Recebida pela empresa", data: "29/07", barra: barOn, cor: "#0C6E6E" },
      { nome: "Resposta da empresa", data: "até 15/08", barra: barOff, cor: "#657493" },
      { nome: "Análise da resposta", data: "—", barra: barOff, cor: "#657493" },
    ],
  },
  {
    titulo: "Tarifa não autorizada — Banco Azul", canal: "Ouvidoria do banco", protocolo: "OUV-77.4521",
    status: "Resolvida", tagBg: "#E6F7F6", tagColor: "#0C6E6E",
    etapas: [
      { nome: "Reclamação enviada", data: "02/07", barra: barOn, cor: "#0C6E6E" },
      { nome: "Resposta da empresa", data: "09/07", barra: barOn, cor: "#0C6E6E" },
      { nome: "Estorno confirmado", data: "11/07", barra: barOn, cor: "#0C6E6E" },
      { nome: "Caso encerrado", data: "12/07", barra: barOn, cor: "#0C6E6E" },
    ],
  },
];

// ---- Painel do advogado ----
export type Caso = {
  nome: string; materia: string; prazo: string; chip: string; chipBg: string; chipColor: string;
  titulo: string; sub: string; prazoChip: string; resumo: string;
  minutaTitulo: string; minuta: string;
};
export const casosData: Caso[] = [
  {
    nome: "Marina L.", materia: "Defesa em ação de cobrança — Loja Meridiano", prazo: "Prazo: 2 dias",
    chip: "Minuta pronta", chipBg: "#E6F7F6", chipColor: "#0C6E6E",
    titulo: "Defesa — Ação de cobrança nº 0045678-21.2026", sub: "Marina L. · 2ª Vara Cível de Osasco/SP · valor da causa R$ 8.300",
    prazoChip: "Prazo fatal: 12/08 (2 dias)",
    resumo: "A usuária é cobrada por crediário de R$ 8.300. A Íris identificou que R$ 2.100 já foram pagos (comprovantes anexos) e que os juros aplicados excedem o contratado. A usuária deseja reconhecer a parte devida e parcelar, contestando os excessos.",
    minutaTitulo: "Minuta de contestação com pedido de parcelamento",
    minuta: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA 2ª VARA CÍVEL DA COMARCA DE OSASCO/SP\n\nAutos nº 0045678-21.2026\n\nMARINA L., já qualificada, vem, respeitosamente, por sua advogada, apresentar CONTESTAÇÃO à ação de cobrança, pelos fundamentos que passa a expor.\n\nI — DOS PAGAMENTOS JÁ REALIZADOS\nA autora deixa de computar os pagamentos de 14/03 e 22/05, que somam R$ 2.100,00 (docs. 4 e 5), reduzindo o débito efetivo a R$ 6.200,00…\n\nII — DOS ENCARGOS EXCESSIVOS\nO contrato prevê juros remuneratórios de 3,2% a.m.; a planilha da autora aplica 5,1% a.m., em desacordo com a avença (doc. 2)…\n\n[trecho destacado para revisão do advogado]",
  },
  {
    nome: "José R.", materia: "Pedido de desbloqueio de salário — verba alimentar", prazo: "Urgente: bloqueio ativo",
    chip: "Urgente", chipBg: "#FDEDE7", chipColor: "#C2451F",
    titulo: "Desbloqueio de verba salarial — Execução nº 0012345-77.2025", sub: "José R. · 1ª Vara de Execuções de Campinas/SP · bloqueio de R$ 4.980",
    prazoChip: "Bloqueio ativo há 6 dias",
    resumo: "Bloqueio judicial atingiu integralmente o salário do usuário (R$ 4.980), verba de natureza alimentar. Extratos organizados comprovam a origem salarial dos valores. Minuta de pedido de desbloqueio preparada com base na impenhorabilidade.",
    minutaTitulo: "Minuta de pedido de desbloqueio — verba impenhorável",
    minuta: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA 1ª VARA DE EXECUÇÕES DA COMARCA DE CAMPINAS/SP\n\nAutos nº 0012345-77.2025\n\nJOSÉ R., executado, vem requerer o DESBLOQUEIO dos valores constritos via SISBAJUD em 04/08, no total de R$ 4.980,00, por se tratar de verba salarial de natureza alimentar…\n\nI — DA ORIGEM SALARIAL DOS VALORES\nOs extratos anexos (docs. 2 a 4) demonstram que a conta atingida recebe exclusivamente os vencimentos do executado…\n\n[trecho destacado para revisão do advogado]",
  },
  {
    nome: "Ana P.", materia: "Recurso administrativo — BPC suspenso", prazo: "Prazo: 12 dias",
    chip: "Aguarda docs", chipBg: "#FFF3E6", chipColor: "#9A5B1F",
    titulo: "Recurso — suspensão de BPC", sub: "Ana P. · INSS · benefício suspenso desde junho",
    prazoChip: "Prazo do recurso: 12 dias",
    resumo: "Benefício BPC suspenso por suposta renda superior ao limite. A Íris identificou que a renda considerada inclui um consignado fraudulento (caso conexo). Aguardando laudo médico atualizado para robustecer o recurso pelo Meu INSS.",
    minutaTitulo: "Minuta de recurso administrativo — Meu INSS",
    minuta: "AO INSTITUTO NACIONAL DO SEGURO SOCIAL — JUNTA DE RECURSOS\n\nRecorrente: ANA P.\nBenefício: BPC/LOAS — NB 703.456.789-0\n\nA recorrente vem apresentar RECURSO contra a suspensão do benefício, demonstrando que a renda familiar considerada é inexistente, decorrente de contrato fraudulento em apuração…\n\n[aguardando documento: laudo médico atualizado]",
  },
];

export const advTabs: { id: "resumo" | "analise" | "minuta"; label: string }[] = [
  { id: "resumo", label: "Resumo e cronologia" },
  { id: "analise", label: "Análise da IA" },
  { id: "minuta", label: "Minuta" },
];

export type Cronologia = { data: string; fato: string };
export const cronologia: Cronologia[] = [
  { data: "03/2024", fato: "Contratação do crediário na Loja Meridiano (R$ 9.600 em 24x)." },
  { data: "03/2026", fato: "Pagamento parcial de R$ 1.200 não computado pela autora." },
  { data: "05/2026", fato: "Segundo pagamento de R$ 900 (comprovante anexo)." },
  { data: "07/2026", fato: "Citação recebida; prazo de defesa calculado até 12/08." },
];

export type Analise = { rotulo: string; texto: string; icon: IconName; bg: string; color: string };
export const analise: Analise[] = [
  { rotulo: "Tese principal", texto: "excesso de cobrança — pagamentos não computados e juros acima do contratado.", icon: "check", bg: "#E6F7F6", color: "#0F8B8B" },
  { rotulo: "Ponto fraco", texto: "o comprovante de 22/05 está com data pouco legível; recomendada 2ª via ao banco.", icon: "alert", bg: "#FFF3E6", color: "#D98324" },
  { rotulo: "Inconsistência", texto: "planilha da autora aplica 5,1% a.m.; contrato prevê 3,2% a.m.", icon: "x", bg: "#FDEDE7", color: "#E2574C" },
  { rotulo: "Pergunta em aberto", texto: "a usuária deseja audiência de conciliação antes da sentença? (sugerido: sim)", icon: "help", bg: "#EAF0F9", color: "#2B4B8F" },
];

// ---- Perguntas frequentes (conteúdo real; alimenta a seção visível + FAQPage JSON-LD p/ AEO) ----
export type Faq = { q: string; a: string };
export const faqs: Faq[] = [
  {
    q: "A Sociedade Fênix é um escritório de advocacia?",
    a: "Não. A Sociedade Fênix Tecnologia organiza a sua situação, prepara documentos e acompanha providências administrativas. Os serviços privativos de advocacia são prestados pela advocacia parceira, sociedade inscrita na OAB, com contrato e honorários próprios.",
  },
  {
    q: "Preciso pagar para começar?",
    a: "Não. A conversa com a Clara, a triagem de urgência e o diagnóstico inicial são gratuitos, sem cartão de crédito. E quando existir um canal público gratuito para a sua etapa, a gente avisa — você não precisa pagar por aquilo.",
  },
  {
    q: "A inteligência artificial substitui o advogado?",
    a: "Não. A IA prepara e organiza; tudo que exige responsabilidade jurídica é analisado e aprovado por um advogado pelo Botão Fênix antes de qualquer providência. Nunca citamos jurisprudência sem confirmar existência, tribunal, número e conteúdo.",
  },
  {
    q: "Vocês vendem os meus dados?",
    a: "Nunca. Não vendemos dados de usuários e não recebemos comissão de credores para direcionar você a um acordo. Os dados são tratados conforme a LGPD, com criptografia e trilha de acesso.",
  },
  {
    q: "Quanto custa a Assinatura Fênix?",
    a: "A Assinatura Fênix custa R$ 99 por mês, com pagamento seguro via Stripe e cancelamento quando você quiser. Há também pacotes de organização a partir de R$ 149. A entrada continua gratuita.",
  },
  {
    q: "Vocês pedem a senha do gov.br ou do meu banco?",
    a: "Nunca. Você faz a autenticação diretamente no serviço oficial. A plataforma não solicita senhas de gov.br, banco ou aplicativos.",
  },
  {
    q: "Que tipos de problema a Fênix ajuda a resolver?",
    a: "Dívidas e cobranças, superendividamento, processos e bloqueios, problemas com bancos e empresas, benefícios do INSS, pendências com a Receita e dívida ativa, questões de MEI, fraudes e golpes — sempre em linguagem simples, um problema de cada vez.",
  },
];

export const fontes: string[] = [
  "CPC, arts. 335 e 336 — prazo e conteúdo da contestação (versão consultada em 08/07/2026)",
  "CDC, art. 42, parágrafo único — repetição do indébito",
  "Contrato de crediário nº 88.213 — cláusula 4ª (juros remuneratórios)",
  "Comprovantes de pagamento — docs. 4 e 5 do dossiê",
];
