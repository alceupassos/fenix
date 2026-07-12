/**
 * OCR provider plugável (env OCR_PROVIDER).
 * mock (default) · tesseract (stub, sem dep nativa) · cloud (HTTP genérico com OCR_API_KEY).
 * Sem dependências nativas pesadas — mock funciona offline e nos smoke tests.
 */

export type OcrProviderName = "mock" | "tesseract" | "cloud";

export type OcrExtractResult = {
  text: string;
  provider: OcrProviderName;
  /** Optional note for audit (e.g. stub / missing key). */
  note?: string;
};

export type OcrExtractInput = {
  buffer: Buffer | Uint8Array;
  mime: string;
  /** Used by mock to pick sample text (cnh, rg, cpf, etc.). */
  fileName?: string;
};

function resolveProvider(): OcrProviderName {
  const raw = (process.env.OCR_PROVIDER ?? "mock").toLowerCase().trim();
  if (raw === "tesseract" || raw === "cloud") return raw;
  return "mock";
}

/** Sample texts for mock OCR — look like real BR documents for regex extractors. */
export function mockSampleForHint(fileName?: string, mime?: string): string {
  const hint = `${fileName ?? ""} ${mime ?? ""}`.toLowerCase();

  if (/cnh|habilita|detran|carteira/.test(hint)) {
    return [
      "REPÚBLICA FEDERATIVA DO BRASIL",
      "CARTEIRA NACIONAL DE HABILITAÇÃO",
      "NOME: MARINA OLIVEIRA SANTOS",
      "DOC. IDENTIDADE / ORG. EMISSOR / UF: 12.345.678-9 SSP/SP",
      "CPF: 529.982.247-25",
      "DATA NASCIMENTO: 15/03/1990",
      "FILIAÇÃO: ANA PAULA SANTOS",
      "JOSE CARLOS OLIVEIRA",
      "ACC: B",
      "CAT. HAB.: B",
      "Nº REGISTRO: 01234567890",
      "VALIDADE: 10/08/2030",
      "1ª HABILITAÇÃO: 20/05/2012",
      "OBSERVAÇÕES: ",
      "LOCAL: SÃO PAULO - SP",
    ].join("\n");
  }

  if (/\brg\b|identidade|registro geral/.test(hint)) {
    return [
      "REPÚBLICA FEDERATIVA DO BRASIL",
      "REGISTRO GERAL",
      "NOME: MARINA OLIVEIRA SANTOS",
      "FILIAÇÃO: ANA PAULA SANTOS / JOSE CARLOS OLIVEIRA",
      "DATA DE NASCIMENTO: 15/03/1990",
      "RG: 12.345.678-9",
      "DATA DE EMISSÃO: 02/11/2015",
      "ÓRGÃO EMISSOR: SSP/SP",
      "CPF: 529.982.247-25",
    ].join("\n");
  }

  if (/cnpj|empresa|contrato social/.test(hint)) {
    return [
      "COMPROVANTE DE INSCRIÇÃO E DE SITUAÇÃO CADASTRAL",
      "CNPJ: 11.444.777/0001-61",
      "NOME EMPRESARIAL: FENIX SERVICOS LTDA",
      "SITUAÇÃO CADASTRAL: ATIVA",
    ].join("\n");
  }

  if (/cpf|cadastro de pessoa/.test(hint)) {
    return [
      "Cadastro de Pessoas Físicas — CPF",
      "Nome: MARINA OLIVEIRA SANTOS",
      "CPF: 529.982.247-25",
      "Situação Cadastral: REGULAR",
      "Data de Nascimento: 15/03/1990",
    ].join("\n");
  }

  if (/comprovante|resid|endere[cç]o|conta de luz|energia|água|agua/.test(hint)) {
    return [
      "COMPROVANTE DE RESIDÊNCIA",
      "Titular: MARINA OLIVEIRA SANTOS",
      "Endereço: Rua das Acácias, 120 — Apto 42",
      "Osasco / SP — CEP 06010-000",
      "CPF: 529.982.247-25",
      "Vencimento: 15/07/2026",
    ].join("\n");
  }

  // Empty buffer or unknown — return empty so callers know OCR found nothing useful
  if (!fileName && (!mime || mime === "application/octet-stream")) {
    return "";
  }

  return [
    "Documento (mock OCR)",
    "Nome: MARINA OLIVEIRA SANTOS",
    "CPF: 529.982.247-25",
  ].join("\n");
}

async function extractMock(input: OcrExtractInput): Promise<OcrExtractResult> {
  const buf = Buffer.isBuffer(input.buffer) ? input.buffer : Buffer.from(input.buffer);
  // Tiny buffer without filename → nothing useful
  if (buf.length < 8 && !input.fileName) {
    return { text: "", provider: "mock", note: "buffer vazio / sem amostra" };
  }
  const text = mockSampleForHint(input.fileName, input.mime);
  return {
    text,
    provider: "mock",
    note: text ? "OCR mock — amostra por nome de arquivo" : "OCR mock — sem texto",
  };
}

/**
 * Tesseract path: no native dep shipped. If `tesseract.js` is installed at runtime,
 * we try a dynamic import; otherwise fall back to mock sample with a clear note.
 */
async function extractTesseract(input: OcrExtractInput): Promise<OcrExtractResult> {
  try {
    // Optional peer — not in package.json; dynamic string import avoids hard dep / tsc resolve
    const dynImport = new Function(
      "specifier",
      "return import(specifier)",
    ) as (s: string) => Promise<{ createWorker?: (lang: string) => Promise<{
      recognize: (buf: Buffer) => Promise<{ data: { text?: string } }>;
      terminate?: () => Promise<void>;
    }>; default?: { createWorker?: (lang: string) => Promise<{
      recognize: (buf: Buffer) => Promise<{ data: { text?: string } }>;
      terminate?: () => Promise<void>;
    }> } }>;
    const mod = await dynImport("tesseract.js").catch(() => null);
    const createWorker = mod?.createWorker ?? mod?.default?.createWorker;
    if (createWorker) {
      const worker = await createWorker("por");
      try {
        const {
          data: { text },
        } = await worker.recognize(Buffer.from(input.buffer));
        return {
          text: String(text ?? "").trim(),
          provider: "tesseract",
          note: "tesseract.js local",
        };
      } finally {
        await worker.terminate?.();
      }
    }
  } catch {
    // fall through
  }
  const mock = await extractMock(input);
  return {
    ...mock,
    provider: "tesseract",
    note: "tesseract.js não instalado — fallback mock (OCR_PROVIDER=tesseract)",
  };
}

/**
 * Cloud OCR: generic HTTP placeholder.
 * POST to OCR_API_URL (default https://api.ocr.placeholder/v1/extract) with
 * Authorization: Bearer OCR_API_KEY and body { mime, base64 }.
 */
async function extractCloud(input: OcrExtractInput): Promise<OcrExtractResult> {
  const key = process.env.OCR_API_KEY?.trim();
  const url =
    process.env.OCR_API_URL?.trim() || "https://api.ocr.placeholder/v1/extract";

  if (!key) {
    const mock = await extractMock(input);
    return {
      ...mock,
      provider: "cloud",
      note: "OCR_API_KEY ausente — fallback mock",
    };
  }

  try {
    const base64 = Buffer.from(input.buffer).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        mime: input.mime,
        fileName: input.fileName,
        base64,
      }),
    });
    if (!res.ok) {
      const mock = await extractMock(input);
      return {
        ...mock,
        provider: "cloud",
        note: `cloud OCR HTTP ${res.status} — fallback mock`,
      };
    }
    const data = (await res.json()) as { text?: string };
    return {
      text: String(data.text ?? "").trim(),
      provider: "cloud",
      note: "cloud OCR",
    };
  } catch (e) {
    const mock = await extractMock(input);
    return {
      ...mock,
      provider: "cloud",
      note: `cloud OCR falhou (${e instanceof Error ? e.message : "erro"}) — fallback mock`,
    };
  }
}

/**
 * Extract text from an image/PDF buffer via the configured OCR provider.
 */
export async function extractText(
  buffer: Buffer | Uint8Array,
  mime: string,
  fileName?: string,
): Promise<OcrExtractResult> {
  const input: OcrExtractInput = { buffer, mime, fileName };
  const provider = resolveProvider();
  switch (provider) {
    case "tesseract":
      return extractTesseract(input);
    case "cloud":
      return extractCloud(input);
    default:
      return extractMock(input);
  }
}

export function getOcrProviderName(): OcrProviderName {
  return resolveProvider();
}
