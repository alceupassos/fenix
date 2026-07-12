/**
 * CNH / Trânsito — orientação prática para serviços de habilitação e multas.
 * Sempre cita canais públicos gratuitos (DETRAN UF, gov.br, CDT).
 * Peças de recurso (defesa prévia / JARI / CETRAN) exigem Botão Fênix.
 * Não inventa artigos do CTB sem rotular "confirme no texto vigente".
 */

import { type AgentResultBase, type AutomationBand, makeAudit } from "./types";

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

export type CnhInput = {
  service: CnhServiceKind;
  /** UF da habilitação / DETRAN. Default SP. */
  uf?: string;
  relato?: string;
  categoria?: string;
  multa?: {
    autoInfracao?: string;
    dataNotificacao?: string;
    etapa?: MultaRecursoEtapa;
    orgao?: string;
  };
  pontos?: number;
};

export type CnhResult = AgentResultBase & {
  service: CnhServiceKind;
  checklist: string[];
  orientacoes: string[];
  documentosNecessarios: string[];
  prazosSugeridos: { label: string; diasUteis?: number; nota: string }[];
  minutaSugerida?: { titulo: string; corpo: string; requiresFenixButton: true };
  detranLinks: { label: string; url: string }[];
};

const SERVICE_LABELS: Record<CnhServiceKind, string> = {
  perda_roubo_extravio: "Perda, roubo ou extravio da CNH",
  renovacao: "Renovação da CNH",
  mudanca_categoria: "Mudança de categoria",
  primeira_habilitacao: "Primeira habilitação",
  cnh_digital: "CNH Digital (CDT)",
  consulta_pontos: "Consulta de pontos",
  recurso_multa: "Recurso de multa",
  suspensao_cassacao: "Suspensão ou cassação",
  crlv_licenciamento_ipva: "CRLV, licenciamento e IPVA",
};

const ETAPA_LABELS: Record<MultaRecursoEtapa, string> = {
  defesa_previa: "Defesa prévia",
  jari: "JARI (Junta Administrativa de Recursos de Infrações)",
  cetran: "CETRAN (recurso em 2ª instância administrativa)",
};

/** DETRAN portals known for major UFs — illustrative, never “the only” channel. */
const DETRAN_URL: Record<string, string> = {
  SP: "https://www.detran.sp.gov.br",
  RJ: "https://www.detran.rj.gov.br",
  MG: "https://www.detran.mg.gov.br",
  PR: "https://www.detran.pr.gov.br",
  RS: "https://www.detran.rs.gov.br",
  BA: "https://www.detran.ba.gov.br",
  DF: "https://www.detran.df.gov.br",
  PE: "https://www.detran.pe.gov.br",
  CE: "https://www.detran.ce.gov.br",
  SC: "https://www.detran.sc.gov.br",
  GO: "https://www.goias.gov.br/detran",
  ES: "https://detran.es.gov.br",
  PA: "https://www.detran.pa.gov.br",
  AM: "https://www.detran.am.gov.br",
  MT: "https://www.detran.mt.gov.br",
  MS: "https://www.detran.ms.gov.br",
};

const GOV_BR = "https://www.gov.br/";
const CDT_URL = "https://www.gov.br/pt-br/servicos/obter-a-carteira-digital-de-transito";

function normalizeUf(uf?: string): string {
  const u = (uf ?? "SP").trim().toUpperCase().slice(0, 2);
  return u.length === 2 ? u : "SP";
}

function detranLinksFor(uf: string): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [
    { label: "gov.br (portal federal)", url: GOV_BR },
  ];
  const detran = DETRAN_URL[uf];
  if (detran) {
    links.unshift({
      label: `DETRAN-${uf} (exemplo de portal estadual — confirme o site oficial da sua UF)`,
      url: detran,
    });
  } else {
    links.unshift({
      label: `Busque o DETRAN-${uf} no site oficial do governo estadual`,
      url: GOV_BR,
    });
  }
  links.push({
    label: "Carteira Digital de Trânsito (CDT) — app gratuito",
    url: CDT_URL,
  });
  return links;
}

function publicChannelsFor(uf: string, extra: string[] = []): string[] {
  const base = [
    `DETRAN-${uf} (canal público gratuito — site/app oficiais do estado)`,
    "gov.br — https://www.gov.br/",
    "Carteira Digital de Trânsito (CDT) — app gratuito (Android/iOS via gov.br)",
    "Defensoria Pública (se elegível e houver contencioso de trânsito)",
  ];
  return [...base, ...extra];
}

function disclaimerCtb(): string {
  return "Qualquer menção a regras do Código de Trânsito Brasileiro (CTB) é orientativa — confirme no texto vigente e no site do DETRAN/SENATRAN antes de agir.";
}

function footerMinutaFenix(): string {
  return (
    `\n\n---\n` +
    `⚠️ RASCUNHO FÊNIX — REVISÃO OBRIGATÓRIA DO ADVOGADO / BOTÃO FÊNIX\n` +
    `Esta peça NÃO deve ser protocolada sem aprovação do advogado responsável (OAB).\n` +
    `A IA prepara. O advogado decide. O sistema executa.\n` +
    `Sem jurisprudência inventada. Fundamentos legais: confirme no CTB e na legislação estadual vigentes.\n` +
    `Metadados: agente cnh v0.1 · faixa amarela · requiresFenixButton=true`
  );
}

function buildRecursoMinuta(input: CnhInput, uf: string): {
  titulo: string;
  corpo: string;
  requiresFenixButton: true;
} {
  const etapa = input.multa?.etapa ?? "defesa_previa";
  const auto = input.multa?.autoInfracao?.trim() || "[nº do auto de infração — preencher]";
  const dataNotif = input.multa?.dataNotificacao?.trim() || "[data da notificação — preencher]";
  const orgao = input.multa?.orgao?.trim() || "[órgão autuador — preencher]";
  const fatos = input.relato?.trim() || "[relato dos fatos e fundamentos a preencher com o usuário]";
  const etapaLabel = ETAPA_LABELS[etapa];

  const destinatario =
    etapa === "defesa_previa"
      ? `AO ÓRGÃO AUTUADOR / AUTORIDADE DE TRÂNSITO COMPETENTE\n(${orgao})`
      : etapa === "jari"
        ? `À JUNTA ADMINISTRATIVA DE RECURSOS DE INFRAÇÕES — JARI\nÓrgão: ${orgao} · UF: ${uf}`
        : `AO CONSELHO ESTADUAL DE TRÂNSITO — CETRAN / ${uf}\n(recurso da decisão da JARI)`;

  const tituloPeca =
    etapa === "defesa_previa"
      ? "DEFESA PRÉVIA"
      : etapa === "jari"
        ? "RECURSO ADMINISTRATIVO À JARI"
        : "RECURSO ADMINISTRATIVO AO CETRAN";

  const corpo =
    `${destinatario}\n\n` +
    `${tituloPeca}\n\n` +
    `Auto de infração nº: ${auto}\n` +
    `Data da notificação (informada): ${dataNotif}\n` +
    `UF de interesse: ${uf}\n\n` +
    `I — DOS FATOS\n${fatos}\n\n` +
    `II — DO DIREITO\n` +
    `O(a) autuado(a) apresenta esta ${etapaLabel.toLowerCase()} com base no direito ao contraditório e à ampla defesa ` +
    `no processo administrativo de trânsito. ` +
    `[TRECHO DESTACADO PARA REVISÃO DO ADVOGADO — não citar artigos do CTB, resoluções CONTRAN/SENATRAN ` +
    `nem jurisprudência sem confirmação no texto vigente e nas fontes oficiais.]\n\n` +
    `Possíveis linhas de análise (apenas checklist para o advogado — NÃO são conclusões):\n` +
    `- Regularidade formal do auto (identificação, local, hora, enquadramento).\n` +
    `- Prazo e forma de notificação (confirme no CTB/resoluções vigentes).\n` +
    `- Elemento subjetivo / materialidade / autoria, se aplicável aos autos.\n` +
    `- Documentos e provas a anexar (fotos, CRLV, CNH, laudos, testemunhas).\n\n` +
    `III — DOS PEDIDOS\n` +
    `Requer-se: (a) o recebimento e processamento desta peça; (b) o acolhimento dos argumentos ` +
    `após análise do dossiê; (c) o cancelamento ou a anulação do auto, se for o caso; ` +
    `(d) a produção das provas pertinentes.\n\n` +
    `Protesta provar o alegado por todos os meios em direito admitidos.\n\n` +
    `Local e data.\n\n` +
    `[Nome do(a) autuado(a)]\n` +
    `[Advogado responsável — OAB · somente após Botão Fênix]\n` +
    footerMinutaFenix();

  return {
    titulo: `Minuta — ${etapaLabel} (auto ${auto})`,
    corpo,
    requiresFenixButton: true,
  };
}

type ServicePack = {
  band: AutomationBand;
  confidence: number;
  summary: string;
  checklist: string[];
  orientacoes: string[];
  documentosNecessarios: string[];
  prazosSugeridos: CnhResult["prazosSugeridos"];
  nextSteps: string[];
  minutaSugerida?: CnhResult["minutaSugerida"];
  extraChannels?: string[];
  notes: string[];
};

function packPerda(uf: string, relato?: string): ServicePack {
  return {
    band: "verde",
    confidence: 0.88,
    summary:
      `Orientação para 2ª via da CNH após perda, roubo ou extravio (UF ${uf}). ` +
      `Use canais gratuitos do DETRAN e a CNH Digital no app CDT enquanto regulariza o plástico, se disponível na sua UF.`,
    checklist: [
      "Registrar Boletim de Ocorrência (B.O.) — presencial ou online, conforme a UF",
      "Acessar o DETRAN da UF com CPF/gov.br e solicitar 2ª via",
      "Pagar a taxa estadual de 2ª via (valor e meios no site do DETRAN)",
      "Instalar/atualizar a Carteira Digital de Trânsito (CDT) se a CNH digital estiver ativa",
      "Guardar protocolo e comprovantes no Cofre Fênix",
    ],
    orientacoes: [
      "Em caso de roubo/furto, priorize o B.O. — muitos DETRANs exigem o número do registro.",
      "A CNH Digital (CDT) tem o mesmo valor jurídico da física quando válida e atualizada — confirme no app.",
      "Não envie senha gov.br a ninguém (nem à Fênix). Autentique só nos apps/sites oficiais.",
      "Se houver bloqueio, restrição ou processo de suspensão em curso, a 2ª via pode depender de regularização — veja também o serviço de suspensão/cassação.",
      relato?.trim()
        ? `Relato considerado: ${relato.trim().slice(0, 280)}${relato.length > 280 ? "…" : ""}`
        : "Se quiser, descreva se foi perda, roubo ou extravio e se já fez B.O.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "CPF e documento de identidade",
      "B.O. (recomendado/obrigatório conforme UF e motivo)",
      "Comprovante de residência (se o DETRAN exigir)",
      "Comprovante de pagamento da taxa de 2ª via",
    ],
    prazosSugeridos: [
      {
        label: "B.O. e início do pedido de 2ª via",
        diasUteis: 2,
        nota: "Quanto antes, melhor — especialmente se dirigir com frequência.",
      },
      {
        label: "Acompanhar emissão / entrega",
        nota: "Prazos de emissão variam por DETRAN; confira o protocolo no portal estadual.",
      },
    ],
    nextSteps: [
      "Faça o B.O. (se ainda não fez) e anote o número.",
      `Abra o portal do DETRAN-${uf} ou o app CDT e inicie a 2ª via.`,
      "Ative/atualize a CNH Digital no CDT, se elegível.",
    ],
    notes: ["service=perda_roubo_extravio", `uf=${uf}`],
  };
}

function packRenovacao(uf: string, categoria?: string): ServicePack {
  const cat = categoria?.trim() || "a da sua CNH atual";
  return {
    band: "verde",
    confidence: 0.86,
    summary:
      `Renovação da CNH (categoria ${cat}, UF ${uf}). ` +
      `Inclui exame de aptidão física e mental e, quando exigido, curso/reciclagem — confirme no DETRAN.`,
    checklist: [
      "Verificar data de validade impressa na CNH / no CDT",
      "Agendar exame médico (e psicológico, se a UF/categoria exigir) em clínica credenciada",
      "Realizar curso de atualização / reciclagem se o DETRAN indicar pendência",
      "Pagar taxas de renovação no canal oficial",
      "Acompanhar emissão da nova CNH e atualização no CDT",
    ],
    orientacoes: [
      "Comece o processo antes do vencimento para evitar dirigir com CNH vencida (infrações e seguro).",
      "Clínicas e valores de exame variam; use a lista de credenciados do DETRAN da sua UF.",
      "Categoria " + cat + ": mudanças de requisito (ex.: exames específicos) devem ser confirmadas no portal estadual.",
      "Após renovar, abra o app CDT e sincronize a CNH Digital.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "CNH atual (física ou digital)",
      "CPF / documento de identidade",
      "Comprovante de pagamento das taxas",
      "Laudo do exame de aptidão física e mental (quando emitido pela clínica)",
    ],
    prazosSugeridos: [
      {
        label: "Iniciar renovação antes do vencimento",
        diasUteis: 30,
        nota: "Sugestão prática: comece com ~30 dias de antecedência (não é prazo legal fixo — confirme no DETRAN).",
      },
      {
        label: "Exame médico + taxas + emissão",
        nota: "O tempo total depende de agenda da clínica e da fila do DETRAN.",
      },
    ],
    nextSteps: [
      `Consulte a validade e pendências no DETRAN-${uf} / CDT.`,
      "Agende o exame em clínica credenciada.",
      "Conclua o pagamento e acompanhe a nova via no CDT.",
    ],
    notes: ["service=renovacao", `uf=${uf}`, `categoria=${cat}`],
  };
}

function packMudancaCategoria(uf: string, categoria?: string): ServicePack {
  const cat = categoria?.trim() || "[categoria desejada — ex.: B→C, B→A]";
  return {
    band: "verde",
    confidence: 0.82,
    summary: `Mudança/adição de categoria (${cat}) no DETRAN-${uf}. Exige exames, aulas e provas conforme a categoria pretendida.`,
    checklist: [
      "Confirmar requisitos da categoria pretendida no DETRAN (idade, tempo de habilitação, exames)",
      "Exames médico e psicológico, se exigidos",
      "Curso teórico/prático em CFC credenciado",
      "Provas teórica e/ou prática conforme o percurso da categoria",
      "Pagamento de taxas e atualização da CNH / CDT",
    ],
    orientacoes: [
      "Cada salto de categoria (ex.: B para C/D/E ou inclusão de A) tem trilha própria — não generalize entre UFs.",
      "Escolha CFC credenciado e guarde contratos e recibos.",
      "Se houver pontuação alta, processo de suspensão ou CNH vencida, regularize antes de avançar.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "CNH atual válida",
      "RG/CPF e comprovante de residência",
      "Comprovantes de aulas e taxas",
      "Laudos de exames exigidos para a categoria",
    ],
    prazosSugeridos: [
      {
        label: "Planejamento do curso e exames",
        nota: "Varie de semanas a meses conforme agenda do CFC e DETRAN.",
      },
    ],
    nextSteps: [
      `Leia o roteiro oficial de mudança de categoria no DETRAN-${uf}.`,
      "Escolha CFC credenciado e inicie matrícula/exames.",
      "Após aprovação, atualize a CNH Digital no CDT.",
    ],
    notes: ["service=mudanca_categoria", `uf=${uf}`, `categoria=${cat}`],
  };
}

function packPrimeiraHab(uf: string, categoria?: string): ServicePack {
  const cat = categoria?.trim() || "ACC/A/B (confirme a pretendida)";
  return {
    band: "verde",
    confidence: 0.84,
    summary: `Primeira habilitação (${cat}) na UF ${uf}: cadastro, exames, CFC, provas e emissão — só pelos canais oficiais.`,
    checklist: [
      "Abrir processo de 1ª habilitação no DETRAN / Poupatempo / equivalente da UF",
      "Exames de aptidão física, mental e psicológica",
      "Curso teórico (legislação, primeiros socorros, direção defensiva, meio ambiente)",
      "Prova teórica",
      "Aulas práticas e exame prático de direção",
      "Emissão da permissão para dirigir (PPD) / CNH e ativação no CDT",
    ],
    orientacoes: [
      "Idade mínima e documentos variam por categoria — confira no DETRAN antes de pagar qualquer curso.",
      "Desconfie de intermediários que prometem “garantir aprovação” ou pedem senha gov.br.",
      "A permissão para dirigir (quando aplicável) tem regras próprias de conversão em CNH definitiva — confirme no texto vigente.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "RG e CPF",
      "Comprovante de residência",
      "Fotos / biometria conforme exigência da UF",
      "Comprovantes de taxas e de conclusão do CFC",
    ],
    prazosSugeridos: [
      {
        label: "Ciclo completo 1ª habilitação",
        nota: "Tipicamente algumas semanas a poucos meses, conforme agenda de provas e CFC.",
      },
    ],
    nextSteps: [
      `Inicie o processo no DETRAN-${uf} (site ou unidade autorizada).`,
      "Matricule-se em CFC credenciado após liberação do processo.",
      "Após aprovação, baixe a CNH Digital no CDT.",
    ],
    notes: ["service=primeira_habilitacao", `uf=${uf}`],
  };
}

function packCnhDigital(uf: string): ServicePack {
  return {
    band: "verde",
    confidence: 0.9,
    summary:
      "CNH Digital via app Carteira Digital de Trânsito (CDT), gratuito, com login gov.br. Mesma validade da via física quando emitida/atualizada corretamente.",
    checklist: [
      "Ter conta gov.br (nível prata/ouro conforme exigência atual do app)",
      "Baixar o app CDT (lojas oficiais Android/iOS)",
      "Login com gov.br e autorização de uso dos dados de trânsito",
      "Baixar/atualizar a CNH Digital e o CRLV Digital do veículo, se houver",
      "Ativar validação offline se o app oferecer (útil sem internet na blitz)",
    ],
    orientacoes: [
      "O CDT é o canal oficial gratuito — não pague apps de terceiros para “gerar CNH”.",
      "Se a CNH não aparecer, verifique pendências no DETRAN da UF (processo aberto, renovação, biometria).",
      "A Fênix nunca pede senha gov.br nem códigos de autenticação.",
      `UF de referência informada: ${uf} — a base nacional conversa com o DETRAN do estado.`,
    ],
    documentosNecessarios: [
      "CPF",
      "Conta gov.br ativa",
      "CNH já emitida no DETRAN (processo concluído)",
    ],
    prazosSugeridos: [
      {
        label: "Disponibilidade no app",
        nota: "Em geral imediata após sincronização; se falhar, aguarde algumas horas e confira o DETRAN.",
      },
    ],
    nextSteps: [
      "Instale o CDT pelas lojas oficiais.",
      "Entre com gov.br e baixe a CNH Digital.",
      "Se não carregar, abra o DETRAN da UF e verifique o status da habilitação.",
    ],
    extraChannels: [CDT_URL],
    notes: ["service=cnh_digital", `uf=${uf}`],
  };
}

function packConsultaPontos(uf: string, pontos?: number, relato?: string): ServicePack {
  const temPontos = typeof pontos === "number" && Number.isFinite(pontos);
  const p = temPontos ? pontos! : null;

  // Situação plugável / mock quando pontos informados
  let situacao = "Consulte o extrato oficial no DETRAN/CDT — não confie só em planilhas de terceiros.";
  let band: AutomationBand = "verde";
  let confidence = 0.75;

  if (p != null) {
    confidence = 0.8;
    if (p >= 40) {
      band = "vermelha";
      situacao =
        `Simulação com base nos pontos informados (${p}): faixa de atenção máxima — risco elevado de processo de suspensão ` +
        `(limites e prazos dependem do CTB vigente e do perfil do condutor — confirme no DETRAN).`;
    } else if (p >= 20) {
      band = "amarela";
      situacao =
        `Simulação com base nos pontos informados (${p}): acumulo relevante. Evite novas infrações e ` +
        `avalie defesa/recurso de multas recentes ainda no prazo. Confirme o limite aplicável no texto vigente.`;
    } else {
      situacao =
        `Simulação com base nos pontos informados (${p}): acumulo moderado/baixo neste recorte. ` +
        `Ainda assim, confira o extrato oficial (infrações em processamento podem não aparecer de imediato).`;
    }
  }

  return {
    band,
    confidence,
    summary: `Consulta de pontos (UF ${uf}). ${situacao}`,
    checklist: [
      "Acessar extrato de pontuação no DETRAN da UF ou no app CDT",
      "Listar autos em aberto, notificados e com prazo de defesa/recurso",
      "Anotar datas de notificação (contam prazos)",
      "Se houver processo de suspensão instaurado, reunir dossiê e buscar orientação jurídica",
    ],
    orientacoes: [
      situacao,
      "Pontos e prazos de contagem seguem o CTB e resoluções — confirme no texto vigente; a Fênix não inventa limites legais.",
      "Infrações de terceiros no seu documento ou venda de veículo sem transferência exigem cuidado extra (comunicação de venda).",
      relato?.trim()
        ? `Relato: ${relato.trim().slice(0, 240)}${relato.length > 240 ? "…" : ""}`
        : "Informe quantos pontos aparecem no extrato para uma triagem mais precisa.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "CPF e acesso gov.br / DETRAN",
      "Print ou PDF do extrato de pontuação",
      "Cópias de notificações e autos recentes",
    ],
    prazosSugeridos: [
      {
        label: "Conferir extrato e prazos de defesa",
        diasUteis: 5,
        nota: "Faça a conferência em poucos dias; prazos de recurso são curtos e contam da notificação.",
      },
    ],
    nextSteps: [
      `Abra o extrato oficial no DETRAN-${uf} ou CDT.`,
      p != null && p >= 20
        ? "Considere o serviço de recurso de multa e/ou suspensão/cassação com revisão de advogado."
        : "Mantenha o hábito de checar o extrato mensalmente.",
      "Cadastre prazos de notificação no Vigia (painel).",
    ],
    notes: [
      "service=consulta_pontos",
      `uf=${uf}`,
      p != null ? `pontos_informados=${p}` : "pontos=nao_informados",
      "situacao_mock_plugavel",
    ],
  };
}

function packRecursoMulta(input: CnhInput, uf: string): ServicePack {
  const etapa = input.multa?.etapa ?? "defesa_previa";
  const minuta = buildRecursoMinuta(input, uf);
  const faltantes: string[] = [];
  if (!input.multa?.autoInfracao?.trim()) faltantes.push("número do auto de infração");
  if (!input.multa?.dataNotificacao?.trim()) faltantes.push("data da notificação");
  if (!input.relato?.trim()) faltantes.push("relato dos fatos");
  if (!input.multa?.orgao?.trim()) faltantes.push("órgão autuador");

  const conf = Math.max(0.4, 0.88 - faltantes.length * 0.1);

  return {
    band: "amarela",
    confidence: conf,
    summary:
      `Rascunho de ${ETAPA_LABELS[etapa]} preparado (faixa amarela). ` +
      `Só protocolar após revisão do advogado e Botão Fênix. ` +
      (faltantes.length ? `Faltam: ${faltantes.join(", ")}.` : "Campos principais preenchidos."),
    checklist: [
      "Notificação da autuação / imposição de penalidade (frente e verso)",
      "Cópia do auto de infração",
      "CNH e CRLV",
      "Provas (fotos, vídeos, telemetria, testemunhas, notas fiscais de manutenção, etc.)",
      "Comprovante de endereço e documentos pessoais",
      "Procuração / substabelecimento se advogado protocolar",
    ],
    orientacoes: [
      "Etapas usuais: defesa prévia → (se multa imposta) recurso à JARI → recurso ao CETRAN. Confirme nomenclatura e prazos no órgão da sua UF.",
      "Prazos contam em geral da notificação — guarde envelopes, AR e prints do app com data.",
      "Protocolar fora do prazo costuma levar ao não conhecimento do recurso — o Vigia pode lembrar se você cadastrar a data.",
      "A minuta abaixo é rascunho estruturado no estilo Oficina: sem jurisprudência inventada e com marca de REVISÃO / Botão Fênix.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "Auto de infração e notificações",
      "Documentos pessoais e do veículo",
      "Provas do relato",
      "Comprovante de protocolo anterior (se JARI/CETRAN)",
    ],
    prazosSugeridos: [
      {
        label: "Defesa prévia (referência operacional)",
        diasUteis: 15,
        nota: "Muitos órgãos usam prazo em torno de 15 dias da notificação da autuação — CONFIRME no documento recebido e no CTB/resoluções vigentes.",
      },
      {
        label: "Recurso JARI (referência operacional)",
        diasUteis: 30,
        nota: "Comumente indicado prazo de 30 dias da notificação da penalidade — CONFIRME no seu caso concreto.",
      },
      {
        label: "Recurso CETRAN",
        nota: "Prazo e forma (eletrônico/presencial) constam da decisão da JARI — leia o cabeçalho da decisão.",
      },
    ],
    nextSteps: [
      "Completar campos faltantes e anexar provas.",
      "Encaminhar a minuta ao advogado para revisão e decisão no Botão Fênix.",
      "Protocolar somente no canal oficial do órgão (DETRAN/prefeitura/PRF etc.) com o comprovante guardado.",
      "Nunca protocolar minuta sem aprovação profissional.",
    ],
    minutaSugerida: minuta,
    extraChannels: [
      "Órgão autuador (quando for municipal/PRF/PM) — use o endereço da própria notificação",
    ],
    notes: [
      "service=recurso_multa",
      `uf=${uf}`,
      `etapa=${etapa}`,
      `faltantes=${faltantes.length}`,
      "requires_fenix_button",
      "sem_jurisprudencia_inventada",
    ],
  };
}

function packSuspensaoCassacao(uf: string, pontos?: number, relato?: string): ServicePack {
  const p = typeof pontos === "number" && Number.isFinite(pontos) ? pontos : null;
  const relatoLower = (relato ?? "").toLowerCase();
  const mencionaCassacao = /cassa/.test(relatoLower);
  const mencionaSuspensao = /suspens/.test(relatoLower);
  const mencionaPrazo = /prazo|notifica|instaur|processo|defesa/.test(relatoLower);

  let band: AutomationBand = "amarela";
  if (mencionaCassacao || (p != null && p >= 40) || mencionaPrazo) {
    band = "vermelha";
  } else if (mencionaSuspensao || (p != null && p >= 20)) {
    band = "amarela";
  }

  return {
    band,
    confidence: 0.72,
    summary:
      band === "vermelha"
        ? `Triagem de suspensão/cassação (UF ${uf}): faixa vermelha — prioridade humana. Monte o dossiê e acione advogado (Botão Fênix) antes de qualquer peça.`
        : `Triagem de suspensão/cassação (UF ${uf}): faixa amarela — a IA organiza o dossiê; medidas jurídicas dependem do advogado.`,
    checklist: [
      "Notificação de instauração do processo de suspensão/cassação",
      "Extrato completo de pontuação e cópia dos autos que originaram o processo",
      "Histórico de defesas/recursos já protocolados",
      "CNH (frente/verso) e comprovante de endereço",
      "Comprovantes de curso de reciclagem (se já realizado ou exigido)",
      "Linha do tempo: datas de notificação, protocolos e prazos",
    ],
    orientacoes: [
      "Suspensão e cassação são medidas graves: dirigir durante o cumprimento pode agravar a situação — confirme efeitos no CTB vigente e na notificação.",
      "Separe o que é processo administrativo no DETRAN do que já é execução de penalidade.",
      "Curso de reciclagem, defesa e recursos têm momentos processuais distintos — não misture prazos.",
      "A Fênix prepara checklist e, se necessário, encaminha para Oficina/advogado; não decide o mérito.",
      p != null ? `Pontos informados na triagem: ${p} (sujeito a confirmação no extrato oficial).` : "Informe a pontuação do extrato para afinar a triagem.",
      relato?.trim()
        ? `Relato: ${relato.trim().slice(0, 280)}${relato.length > 280 ? "…" : ""}`
        : "Descreva se já recebeu notificação de processo e qual o prazo indicado no documento.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "Notificações do DETRAN / órgão de trânsito",
      "Extrato de pontos e autos relacionados",
      "Documentos pessoais e CNH",
      "Comprovantes de protocolos anteriores",
    ],
    prazosSugeridos: [
      {
        label: "Prazo de defesa no processo de suspensão/cassação",
        nota: "Use EXCLUSIVAMENTE o prazo impresso na notificação oficial. Cadastre no Vigia no mesmo dia.",
      },
      {
        label: "Organização do dossiê",
        diasUteis: 3,
        nota: "Meta operacional interna: reunir PDFs e linha do tempo em até 3 dias úteis.",
      },
    ],
    nextSteps: [
      "Fotografar/digitalizar a notificação completa (todas as páginas).",
      "Montar linha do tempo e extrato de pontos no Cofre.",
      band === "vermelha"
        ? "Acionar atendimento prioritário / advogado parceiro (Botão Fênix) com o dossiê."
        : "Solicitar revisão do advogado para decidir defesa ou recurso.",
      "Não ignore prazos — o silêncio costuma levar ao julgamento à revelia administrativa.",
    ],
    notes: [
      "service=suspensao_cassacao",
      `uf=${uf}`,
      `band=${band}`,
      p != null ? `pontos=${p}` : "pontos=n/d",
      "triagem_dossie",
    ],
  };
}

function packCrlvIpva(uf: string): ServicePack {
  return {
    band: "verde",
    confidence: 0.87,
    summary:
      `CRLV, licenciamento anual e IPVA (UF ${uf}). Canais oficiais do DETRAN/Secretaria da Fazenda — evite despachantes não solicitados se preferir o caminho gratuito.`,
    checklist: [
      "Consultar débitos do veículo (IPVA, licenciamento, multas, seguro DPVAT se ainda aplicável na UF/ano)",
      "Regularizar multas e impostos pendentes",
      "Pagar a taxa de licenciamento no banco/app oficial",
      "Emitir CRLV-e no CDT ou portal do DETRAN",
      "Em transferência: comunicação de venda, vistoria e DUT/ATPV conforme regras da UF",
    ],
    orientacoes: [
      "O CRLV digital no app CDT substitui o documento plástico na maioria das fiscalizações quando válido.",
      "IPVA é tributo estadual: calendário e descontos por cota variam — consulte a SEFAZ/DETRAN da UF.",
      "Na compra/venda, a comunicação de venda protege o vendedor de multas e pontuação posteriores — faça no DETRAN.",
      "Transferência de propriedade exige documentos do comprador/vendedor e, em regra, vistoria — confirme o checklist estadual.",
      disclaimerCtb(),
    ],
    documentosNecessarios: [
      "CRLV anterior / número do RENAVAM",
      "Documento do proprietário (CPF/CNPJ)",
      "Comprovantes de pagamento de IPVA e taxas",
      "ATPV-e / DUT assinado e reconhecido, se transferência (conforme regra vigente da UF)",
    ],
    prazosSugeridos: [
      {
        label: "Licenciamento no exercício",
        nota: "Siga o calendário por final de placa divulgado pelo DETRAN da UF — atrasos geram multa e apreensão em fiscalização.",
      },
      {
        label: "Comunicação de venda",
        diasUteis: 30,
        nota: "Referência operacional comum — CONFIRME o prazo no DETRAN da sua UF e no CTB vigente.",
      },
    ],
    nextSteps: [
      `Consulte débitos no DETRAN-${uf} e na SEFAZ estadual.`,
      "Pague licenciamento/IPVA nos canais oficiais e emita o CRLV-e no CDT.",
      "Se for transferência, siga o checklist de compra e venda do DETRAN (nunca entregue o veículo sem proteção documental).",
    ],
    notes: ["service=crlv_licenciamento_ipva", `uf=${uf}`],
  };
}

export function runCnh(input: CnhInput): CnhResult {
  const uf = normalizeUf(input.uf);
  const service = input.service;

  let pack: ServicePack;
  switch (service) {
    case "perda_roubo_extravio":
      pack = packPerda(uf, input.relato);
      break;
    case "renovacao":
      pack = packRenovacao(uf, input.categoria);
      break;
    case "mudanca_categoria":
      pack = packMudancaCategoria(uf, input.categoria);
      break;
    case "primeira_habilitacao":
      pack = packPrimeiraHab(uf, input.categoria);
      break;
    case "cnh_digital":
      pack = packCnhDigital(uf);
      break;
    case "consulta_pontos":
      pack = packConsultaPontos(uf, input.pontos, input.relato);
      break;
    case "recurso_multa":
      pack = packRecursoMulta(input, uf);
      break;
    case "suspensao_cassacao":
      pack = packSuspensaoCassacao(uf, input.pontos, input.relato);
      break;
    case "crlv_licenciamento_ipva":
      pack = packCrlvIpva(uf);
      break;
    default: {
      const _exhaustive: never = service;
      throw new Error(`Serviço CNH desconhecido: ${_exhaustive}`);
    }
  }

  const detranLinks = detranLinksFor(uf);
  const publicChannels = publicChannelsFor(uf, pack.extraChannels);
  const requiresLawyerReview =
    pack.band !== "verde" || Boolean(pack.minutaSugerida);

  return {
    service,
    checklist: pack.checklist,
    orientacoes: pack.orientacoes,
    documentosNecessarios: pack.documentosNecessarios,
    prazosSugeridos: pack.prazosSugeridos,
    minutaSugerida: pack.minutaSugerida,
    detranLinks,
    band: pack.band,
    confidence: pack.confidence,
    summary: pack.summary,
    nextSteps: pack.nextSteps,
    publicChannels,
    audit: makeAudit("cnh", pack.band, {
      notes: pack.notes,
      sources: [
        "roteiro CNH/Trânsito Fênix v0.1",
        `DETRAN-${uf} (canal público)`,
        "gov.br",
        "CDT / SENATRAN (quando aplicável)",
        "CTB — confirme sempre o texto vigente",
      ],
      requiresLawyerReview,
    }),
  };
}

export const CNH_SERVICE_OPTIONS: { value: CnhServiceKind; label: string }[] = (
  Object.keys(SERVICE_LABELS) as CnhServiceKind[]
).map((value) => ({ value, label: SERVICE_LABELS[value] }));
