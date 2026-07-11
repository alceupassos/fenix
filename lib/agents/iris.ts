/**
 * Íris — document reading (regex/heuristic extraction).
 * OCR is a later layer; this MVP extracts from pasted text / OCR output.
 * Marks every field as confirmed | inferred | missing — never invents process numbers.
 */

import {
  type AgentResultBase,
  type AutomationBand,
  type ProvenanceField,
  makeAudit,
} from "./types";

export type IrisDocKind =
  | "citacao"
  | "fatura"
  | "contrato"
  | "extrato"
  | "notificacao"
  | "desconhecido";

export type IrisInput = {
  text: string;
  fileName?: string;
};

export type IrisExtracted = {
  kind: IrisDocKind;
  datas: ProvenanceField[];
  valores: ProvenanceField[];
  partes: ProvenanceField[];
  numeroProcesso: ProvenanceField;
  orgao: ProvenanceField;
  prazoSugerido: ProvenanceField;
  rawHighlights: string[];
};

export type IrisResult = AgentResultBase & {
  extracted: IrisExtracted;
};

const DATE_RE =
  /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\b/gi;
const MONEY_RE = /R\$\s*[\d.]+(?:,\d{2})?|\b\d{1,3}(?:\.\d{3})+,\d{2}\b/g;
const PROCESS_RE =
  /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b|\b\d{5,7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;
const ORGAO_RE =
  /\b(\d+ª?\s*Vara\s+[\wáéíóúâêôãõç\s/]+|Tribunal\s+[\wáéíóúâêôãõç\s]+|INSS|Receita\s+Federal|Procon|Banco\s+[\w]+)/i;

function classify(text: string, fileName?: string): IrisDocKind {
  const t = `${fileName ?? ""} ${text}`.toLowerCase();
  if (/cita[cç][aã]o|oficial de justi[cç]a|mandado|intim[aã][cç][aã]o/.test(t)) return "citacao";
  if (/fatura|vencimento|cart[aã]o de cr[eé]dito|valor da fatura/.test(t)) return "fatura";
  if (/contrato|cl[aá]usula|partes contratantes|taxa de juros/.test(t)) return "contrato";
  if (/extrato|saldo|lan[cç]amento|pix/.test(t)) return "extrato";
  if (/notifica[cç][aã]o|protesto|cobran[cç]a extrajudicial/.test(t)) return "notificacao";
  return "desconhecido";
}

function field(value: string | null, provenance: ProvenanceField["provenance"], confidence: number, source?: string): ProvenanceField {
  return { value, provenance, confidence, source };
}

/**
 * Extract structured fields from document text. No LLM required.
 */
export function runIris(input: IrisInput): IrisResult {
  const text = (input.text ?? "").trim();
  const kind = classify(text, input.fileName);

  const dates = [...text.matchAll(DATE_RE)].map((m) =>
    field(m[0], "confirmed", 0.9, "regex:data"),
  );
  const valores = [...text.matchAll(MONEY_RE)].map((m) =>
    field(m[0], "confirmed", 0.9, "regex:valor"),
  );

  const procMatch = text.match(PROCESS_RE);
  const numeroProcesso = procMatch
    ? field(procMatch[0], "confirmed", 0.95, "regex:cnj")
    : field(null, "missing", 0, undefined);

  const orgaoMatch = text.match(ORGAO_RE);
  const orgao = orgaoMatch
    ? field(orgaoMatch[0].trim(), "confirmed", 0.75, "regex:orgao")
    : field(null, "missing", 0, undefined);

  // Partes: very light heuristic — lines with "vs" / "x" / "autor" / "réu"
  const partes: ProvenanceField[] = [];
  const parteLines = text.split(/\n/).filter((l) => /\b(autor|r[eé]u|requerente|requerid[oa]|vs\.?| x )\b/i.test(l));
  for (const line of parteLines.slice(0, 4)) {
    partes.push(field(line.trim().slice(0, 120), "inferred", 0.55, "heuristica:parte"));
  }

  let prazoSugerido: ProvenanceField = field(null, "missing", 0);
  if (kind === "citacao" && dates.length) {
    prazoSugerido = field(
      dates[0].value,
      "inferred",
      0.5,
      "heuristica:primeira_data_citacao_nao_e_prazo_confirmado",
    );
  }

  const highlights = [
    ...dates.slice(0, 3).map((d) => `Data: ${d.value}`),
    ...valores.slice(0, 3).map((v) => `Valor: ${v.value}`),
    numeroProcesso.value ? `Processo: ${numeroProcesso.value}` : null,
    orgao.value ? `Órgão: ${orgao.value}` : null,
  ].filter(Boolean) as string[];

  const band: AutomationBand =
    kind === "citacao" || kind === "notificacao" ? "amarela" : "verde";

  const nextSteps: string[] = [];
  if (kind === "citacao") {
    nextSteps.push("Confira se a data de recebimento está correta — o prazo processal conta a partir dela.");
    nextSteps.push("A minuta de defesa, se houver, só segue após o Botão Fênix (advogado).");
  }
  if (kind === "fatura" || kind === "contrato") {
    nextSteps.push("Valores extraídos entram no Raio-X do Atlas após você confirmar.");
  }
  if (!text) {
    nextSteps.push("Cole o texto do documento ou envie uma foto legível.");
  } else if (kind === "desconhecido") {
    nextSteps.push("Não classificamos o tipo com segurança — descreva o que é o papel em uma frase.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("Revise os campos extraídos e confirme o que estiver correto.");
  }

  const extracted: IrisExtracted = {
    kind,
    datas: dates.slice(0, 8),
    valores: valores.slice(0, 8),
    partes,
    numeroProcesso,
    orgao,
    prazoSugerido,
    rawHighlights: highlights,
  };

  const summary = text
    ? `Íris leu o documento como “${kind}”. ${highlights.length ? `Destaques: ${highlights.slice(0, 3).join(" · ")}.` : "Poucos campos estruturados encontrados — confira o original."}`
    : "Nenhum texto recebido para leitura.";

  return {
    extracted,
    band,
    confidence: text.length < 40 ? 0.3 : kind === "desconhecido" ? 0.5 : 0.75,
    summary,
    nextSteps,
    publicChannels: [
      "Nunca digite senha de gov.br ou banco aqui",
      "Defensoria Pública / Procon quando for o caso",
    ],
    audit: makeAudit("iris", band, {
      notes: [
        `kind=${kind}`,
        `dates=${dates.length}`,
        `valores=${valores.length}`,
        `processo=${numeroProcesso.provenance}`,
        "Campos 'inferred' NÃO são fatos jurídicos confirmados",
      ],
      sources: ["extrator heurístico Íris v0.1", "sem OCR nesta versão"],
      requiresLawyerReview: kind === "citacao" || kind === "notificacao",
    }),
  };
}
