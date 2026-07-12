/**
 * DocCheck — checagem determinística de documentos (CPF/CNPJ/RG/CNH/comprovante).
 * Valida dígitos, extrai campos por regex, cross-check com cadastro e score antifraude.
 * Nunca auto-aprova atos jurídicos: faixa amarela/vermelha → requiresLawyerReview.
 */

import {
  type AutomationBand,
  type ProvenanceField,
  makeAudit,
} from "./types";
import {
  isValidCpf,
  isValidCnpj,
  onlyDigits,
  nameSimilarity,
  formatCpf,
  formatCnpj,
} from "@/lib/validators/cpf-cnpj";
import type { DocCheckResult } from "@/lib/kyc-contracts";

export type DocCheckKind = "rg" | "cnh" | "cpf" | "comprovante" | "cnpj";

export type DocCheckInput = {
  text?: string;
  kind?: DocCheckKind;
  cadastro?: {
    nome: string;
    cpf: string;
    dataNascimento?: string;
  };
  fileName?: string;
};

export type { DocCheckResult };

// Re-export validators for smoke/unit tests
export { isValidCpf, isValidCnpj, nameSimilarity, onlyDigits };

const DATE_RE = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/;
const CPF_RE = /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g;
const CNPJ_RE = /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;

function field(
  value: string | null,
  provenance: ProvenanceField["provenance"],
  confidence: number,
  source?: string,
): ProvenanceField {
  return { value, provenance, confidence, source };
}

function classifyKind(text: string, fileName?: string, forced?: DocCheckKind): DocCheckKind {
  if (forced) return forced;
  const t = `${fileName ?? ""} ${text}`.toLowerCase();
  if (/cnh|habilita[cç][aã]o|detran|cat\.?\s*hab|n[ºo°]?\s*registro/.test(t)) return "cnh";
  if (/\brg\b|registro geral|ssp\/|identidade/.test(t) && !/cnh|habilita/.test(t)) return "rg";
  if (/cnpj|raz[aã]o social|nome empresarial|inscri[cç][aã]o estadual/.test(t)) return "cnpj";
  if (/comprovante|resid[eê]ncia|conta de (luz|energia|[aá]gua)|cep\s*:/.test(t)) return "comprovante";
  if (/\bcpf\b|cadastro de pessoas f[ií]sicas/.test(t)) return "cpf";
  // digit-length hints
  const digits = onlyDigits(text);
  if (digits.length >= 14 && isValidCnpj(digits.slice(0, 14))) return "cnpj";
  return "cpf";
}

function extractNome(text: string): ProvenanceField {
  const patterns = [
    /NOME[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]{4,80})/i,
    /Titular[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s]{4,80})/i,
    /Nome empresarial[:\s]+([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç0-9\s\.]{2,80})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const v = m[1].replace(/\s+/g, " ").trim();
      if (v.length >= 5) return field(v, "confirmed", 0.88, "regex:nome");
    }
  }
  return field(null, "missing", 0);
}

function extractFilicao(text: string): ProvenanceField {
  const m = text.match(/FILIA[CÇ][AÃ]O[:\s]+([^\n]{5,120})/i);
  if (m?.[1]) {
    return field(m[1].replace(/\s+/g, " ").trim(), "confirmed", 0.85, "regex:filiacao");
  }
  return field(null, "missing", 0);
}

function extractFirstCpf(text: string): ProvenanceField {
  const matches = [...text.matchAll(CPF_RE)].map((m) => m[1]);
  for (const raw of matches) {
    const d = onlyDigits(raw);
    if (d.length === 11) {
      const ok = isValidCpf(d);
      return field(
        formatCpf(d),
        ok ? "confirmed" : "inferred",
        ok ? 0.95 : 0.4,
        ok ? "regex:cpf+dv" : "regex:cpf-dv-invalido",
      );
    }
  }
  return field(null, "missing", 0);
}

function extractFirstCnpj(text: string): ProvenanceField {
  const matches = [...text.matchAll(CNPJ_RE)].map((m) => m[1]);
  for (const raw of matches) {
    const d = onlyDigits(raw);
    if (d.length === 14) {
      const ok = isValidCnpj(d);
      return field(
        formatCnpj(d),
        ok ? "confirmed" : "inferred",
        ok ? 0.95 : 0.4,
        ok ? "regex:cnpj+dv" : "regex:cnpj-dv-invalido",
      );
    }
  }
  return field(null, "missing", 0);
}

function extractDateNear(text: string, labelRe: RegExp): ProvenanceField {
  // Match label then a date within ~40 chars
  const re = new RegExp(
    labelRe.source + "[^\\d]{0,40}" + DATE_RE.source,
    "i",
  );
  const m = text.match(re);
  if (m) {
    const datePart = m[0].match(DATE_RE);
    if (datePart) return field(datePart[1], "confirmed", 0.9, "regex:data");
  }
  return field(null, "missing", 0);
}

/** CNH-specific fields */
function extractCnh(text: string): Record<string, ProvenanceField> {
  const registro =
    text.match(/N[ºO°]?\s*REGISTRO[:\s]*(\d{9,11})/i) ||
    text.match(/REGISTRO[:\s]*(\d{9,11})/i);
  const categoria =
    text.match(/CAT\.?\s*HAB\.?[:\s]*([A-E]{1,4})/i) ||
    text.match(/CATEGORIA[:\s]*([A-E]{1,4}|AB|AC|AD|AE|ACC)/i);
  const validade = extractDateNear(text, /VALIDADE/);
  const pontos =
    text.match(/PONTOS?[:\s]*(\d{1,2})\b/i) ||
    text.match(/PONTUA[CÇ][AÃ]O[:\s]*(\d{1,2})\b/i);

  return {
    numeroRegistro: registro
      ? field(registro[1], "confirmed", 0.9, "regex:cnh-registro")
      : field(null, "missing", 0),
    nome: extractNome(text),
    filiacao: extractFilicao(text),
    validade,
    categoria: categoria
      ? field(categoria[1].toUpperCase(), "confirmed", 0.9, "regex:cnh-categoria")
      : field(null, "missing", 0),
    pontos: pontos
      ? field(pontos[1], "confirmed", 0.75, "regex:cnh-pontos")
      : field(null, "missing", 0),
    cpf: extractFirstCpf(text),
    dataNascimento: extractDateNear(text, /(?:DATA\s*(?:DE\s*)?NASCIMENTO|NASC\.?)/),
  };
}

/** RG-specific fields */
function extractRg(text: string): Record<string, ProvenanceField> {
  const numero =
    text.match(/\bRG[:\s]*([\d.\-X]{5,15})/i) ||
    text.match(/REGISTRO\s+GERAL[:\s]*([\d.\-X]{5,15})/i) ||
    text.match(/DOC\.?\s*IDENTIDADE[^:\n]*[:\s]*([\d.\-X]{5,15})/i);

  return {
    numero: numero
      ? field(numero[1].trim(), "confirmed", 0.88, "regex:rg-numero")
      : field(null, "missing", 0),
    nome: extractNome(text),
    filiacao: extractFilicao(text),
    dataEmissao: extractDateNear(text, /(?:DATA\s*(?:DE\s*)?EMISS[AÃ]O|EMISS[AÃ]O)/),
    cpf: extractFirstCpf(text),
    dataNascimento: extractDateNear(text, /(?:DATA\s*(?:DE\s*)?NASCIMENTO|NASC\.?)/),
  };
}

function extractCpfDoc(text: string): Record<string, ProvenanceField> {
  return {
    cpf: extractFirstCpf(text),
    nome: extractNome(text),
    dataNascimento: extractDateNear(text, /(?:DATA\s*(?:DE\s*)?NASCIMENTO|NASC\.?)/),
  };
}

function extractCnpjDoc(text: string): Record<string, ProvenanceField> {
  return {
    cnpj: extractFirstCnpj(text),
    razaoSocial: extractNome(text),
  };
}

function extractComprovante(text: string): Record<string, ProvenanceField> {
  const end =
    text.match(/Endere[cç]o[:\s]+([^\n]{8,120})/i) ||
    text.match(/(Rua|Av\.|Avenida|Travessa|Alameda)\s+[^\n]{5,100}/i);
  return {
    nome: extractNome(text),
    cpf: extractFirstCpf(text),
    endereco: end
      ? field(end[0].replace(/Endere[cç]o[:\s]+/i, "").trim(), "confirmed", 0.8, "regex:endereco")
      : field(null, "missing", 0),
  };
}

function normalizeDateLoose(s: string): string {
  const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return s.trim().toLowerCase();
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yyyy = m[3];
  if (yyyy.length === 2) yyyy = `20${yyyy}`;
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Heuristic fraud score 0–100 (higher = more suspicious).
 * Does NOT prove fraud — only triage for human review.
 */
export function computeFraudScore(opts: {
  text: string;
  campos: Record<string, ProvenanceField>;
  crossCheck: DocCheckResult["crossCheck"];
  kind: DocCheckKind;
}): number {
  let score = 0;
  const { text, campos, crossCheck, kind } = opts;

  // Low contrast / short OCR text
  if (text.trim().length < 40) score += 35;
  else if (text.trim().length < 80) score += 15;

  // Repeated digits (common in forged/placeholder docs)
  if (/(\d)\1{6,}/.test(onlyDigits(text))) score += 25;
  if (/000\.000\.000-00|111\.111\.111-11|123\.456\.789-09/.test(text)) score += 30;

  // Invalid check digits on extracted ids
  if (campos.cpf?.value && !isValidCpf(campos.cpf.value)) score += 40;
  if (campos.cnpj?.value && !isValidCnpj(campos.cnpj.value)) score += 40;

  // Severe cross-check mismatch
  if (crossCheck.cpfMatch === false) score += 35;
  if (crossCheck.nomeMatch === false) score += 25;
  if (crossCheck.dataMatch === false) score += 15;

  // Missing critical fields for kind
  if (kind === "cnh" && !campos.numeroRegistro?.value) score += 12;
  if (kind === "rg" && !campos.numero?.value) score += 10;
  if ((kind === "cpf" || kind === "cnh" || kind === "rg") && !campos.cpf?.value) score += 10;

  // Very high density of same character (garbage OCR / image noise)
  const alpha = text.replace(/\s/g, "");
  if (alpha.length > 20) {
    const counts = new Map<string, number>();
    for (const ch of alpha) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const max = Math.max(...counts.values());
    if (max / alpha.length > 0.4) score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

function pickBand(
  confidence: number,
  fraudScore: number,
  crossCheck: DocCheckResult["crossCheck"],
  missingCritical: boolean,
): AutomationBand {
  // CPF diverge do cadastro, ou nome + data juntos (risco alto de identidade errada)
  const severeMismatch =
    crossCheck.cpfMatch === false ||
    (crossCheck.nomeMatch === false && crossCheck.dataMatch === false);

  if (fraudScore >= 55 || severeMismatch) return "vermelha";
  if (fraudScore >= 30 || confidence < 0.55 || missingCritical || crossCheck.nomeMatch === false) {
    return "amarela";
  }
  if (confidence >= 0.7 && fraudScore < 25 && crossCheck.divergences.length === 0) {
    return "verde";
  }
  return "amarela";
}

/**
 * Run document check: extract fields, validate digits, cross-check cadastro, fraud heuristics.
 */
export function runDocCheck(input: DocCheckInput): DocCheckResult {
  const text = (input.text ?? "").trim();
  const kind = classifyKind(text, input.fileName, input.kind);

  let campos: Record<string, ProvenanceField>;
  switch (kind) {
    case "cnh":
      campos = extractCnh(text);
      break;
    case "rg":
      campos = extractRg(text);
      break;
    case "cnpj":
      campos = extractCnpjDoc(text);
      break;
    case "comprovante":
      campos = extractComprovante(text);
      break;
    case "cpf":
    default:
      campos = extractCpfDoc(text);
      break;
  }

  // Cross-check vs cadastro
  const divergences: string[] = [];
  let nomeMatch: boolean | null = null;
  let cpfMatch: boolean | null = null;
  let dataMatch: boolean | null = null;

  const cad = input.cadastro;
  if (cad) {
    const docNome = campos.nome?.value ?? campos.razaoSocial?.value;
    if (docNome && cad.nome) {
      const sim = nameSimilarity(docNome, cad.nome);
      nomeMatch = sim >= 0.6;
      if (!nomeMatch) {
        divergences.push(
          `Nome do documento (${docNome}) diverge do cadastro (${cad.nome}) — similaridade ${(sim * 100).toFixed(0)}%`,
        );
      }
    } else if (cad.nome && !docNome) {
      nomeMatch = null;
      divergences.push("Nome não extraído do documento para cruzar com o cadastro");
    }

    const docCpf = campos.cpf?.value;
    if (docCpf && cad.cpf) {
      cpfMatch = onlyDigits(docCpf) === onlyDigits(cad.cpf);
      if (!cpfMatch) {
        divergences.push(
          `CPF do documento (${docCpf}) diverge do cadastro (${formatCpf(onlyDigits(cad.cpf))})`,
        );
      }
      if (!isValidCpf(cad.cpf)) {
        divergences.push("CPF do cadastro tem dígitos verificadores inválidos");
      }
    } else if (cad.cpf && !docCpf && kind !== "cnpj") {
      cpfMatch = null;
      divergences.push("CPF não encontrado no texto do documento");
    }

    if (cad.dataNascimento && campos.dataNascimento?.value) {
      dataMatch =
        normalizeDateLoose(campos.dataNascimento.value) ===
        normalizeDateLoose(cad.dataNascimento);
      if (!dataMatch) {
        divergences.push(
          `Data de nascimento do documento (${campos.dataNascimento.value}) diverge do cadastro (${cad.dataNascimento})`,
        );
      }
    }
  }

  // Standalone digit validation notes
  if (campos.cpf?.value && !isValidCpf(campos.cpf.value)) {
    divergences.push(`CPF extraído com dígitos verificadores inválidos: ${campos.cpf.value}`);
  }
  if (campos.cnpj?.value && !isValidCnpj(campos.cnpj.value)) {
    divergences.push(`CNPJ extraído com dígitos verificadores inválidos: ${campos.cnpj.value}`);
  }

  const crossCheck = { nomeMatch, cpfMatch, dataMatch, divergences };

  const fraudScore = computeFraudScore({ text, campos, crossCheck, kind });

  // Confidence: average of present fields + bonus for valid digits + penalty for fraud
  const values = Object.values(campos);
  const present = values.filter((c) => c.value != null);
  const avgFieldConf =
    present.length === 0
      ? 0.1
      : present.reduce((s, c) => s + c.confidence, 0) / present.length;
  let confidence = text.length < 20 ? avgFieldConf * 0.4 : avgFieldConf;
  if (campos.cpf?.value && isValidCpf(campos.cpf.value)) confidence = Math.min(1, confidence + 0.05);
  if (campos.cnpj?.value && isValidCnpj(campos.cnpj.value)) confidence = Math.min(1, confidence + 0.05);
  if (nomeMatch === true && cpfMatch === true) confidence = Math.min(1, confidence + 0.08);
  if (fraudScore >= 40) confidence = Math.max(0.1, confidence - 0.25);
  confidence = Math.round(confidence * 100) / 100;

  const missingCritical =
    (kind === "cnh" && !campos.numeroRegistro?.value) ||
    (kind === "rg" && !campos.numero?.value) ||
    (kind === "cpf" && !campos.cpf?.value) ||
    (kind === "cnpj" && !campos.cnpj?.value) ||
    !text;

  const band = pickBand(confidence, fraudScore, crossCheck, missingCritical);
  const requiresLawyerReview = band !== "verde";

  const provenance: Record<string, ProvenanceField["provenance"]> = {};
  for (const [k, v] of Object.entries(campos)) {
    provenance[k] = v.provenance;
  }

  const nextSteps: string[] = [];
  if (!text) {
    nextSteps.push("Envie o texto do documento, foto legível (OCR) ou PDF com camada de texto.");
  }
  if (band === "vermelha") {
    nextSteps.push("Documento com indícios de divergência ou risco — fila de revisão humana (Botão Fênix).");
    nextSteps.push("Não use este documento sozinho para atos com responsabilidade jurídica.");
  } else if (band === "amarela") {
    nextSteps.push("Confira os campos extraídos e complete o que estiver faltando.");
    nextSteps.push("Revisão do advogado necessária antes de qualquer protocolo ou ato formal.");
  } else {
    nextSteps.push("Campos consistentes com o cadastro — você pode seguir o fluxo de verificação.");
    nextSteps.push("Atos jurídicos (procuração, protocolo, recurso) ainda passam pelo advogado quando aplicável.");
  }
  if (kind === "cnh") {
    nextSteps.push("Para 2ª via, renovação ou recurso de multa, use o núcleo CNH e canais DETRAN/gov.br.");
  }
  if (kind === "cnpj" || kind === "cpf") {
    nextSteps.push("Confira a situação cadastral no canal público da Receita Federal (gov.br) quando precisar do oficial.");
  }

  const summaryParts: string[] = [];
  summaryParts.push(`Checagem de ${kind.toUpperCase()}.`);
  if (present.length) {
    summaryParts.push(`${present.length} campo(s) extraído(s).`);
  } else {
    summaryParts.push("Poucos ou nenhum campo estruturado encontrado.");
  }
  if (divergences.length) {
    summaryParts.push(`${divergences.length} divergência(s) no cruzamento.`);
  }
  summaryParts.push(`Score antifraude heurístico: ${fraudScore}/100 (não prova fraude).`);
  summaryParts.push(
    band === "verde"
      ? "Faixa verde — dados coerentes; atos jurídicos seguem regras do núcleo."
      : "Faixa " + band + " — revisão humana antes de atos com responsabilidade jurídica.",
  );

  const sources = [
    "DocCheck Fênix v0.1 (regex + dígitos verificadores)",
    "Algoritmo CPF/CNPJ Receita Federal (local, sem rede)",
    `kind=${kind}`,
  ];
  if (kind === "cpf" || kind === "cnpj") {
    sources.push("Canal público: gov.br / Receita Federal (situação cadastral — consulta manual ou provider plugável)");
  }
  if (kind === "cnh") {
    sources.push("Canal público: DETRAN do estado / Carteira Digital de Trânsito (gov.br)");
  }

  const notes = [
    `kind=${kind}`,
    `fraudScore=${fraudScore}`,
    `camposPresentes=${present.length}`,
    `divergencias=${divergences.length}`,
    "Score antifraude é heurística de triagem — não é laudo pericial",
    "Nunca auto-aprova ato jurídico; amarela/vermelha → Botão Fênix",
  ];

  return {
    campos,
    provenance,
    confidence,
    band,
    fraudScore,
    crossCheck,
    summary: summaryParts.join(" "),
    nextSteps,
    publicChannels: [
      "Receita Federal / gov.br — CPF e CNPJ (situação cadastral)",
      "DETRAN do seu estado / Carteira Digital de Trânsito (CNH)",
      "Nunca digite senha de gov.br ou banco neste chat",
      "Defensoria Pública quando houver hipossuficiência",
    ],
    audit: makeAudit("doccheck", band, {
      notes,
      sources,
      requiresLawyerReview,
      version: "0.1.0",
    }),
  };
}
