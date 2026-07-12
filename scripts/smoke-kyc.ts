/**
 * Smoke tests — Onda KYC (validators, vault crypto, mime, doccheck, CNH, KYC provider, AbacatePay, LGPD masks).
 * Run: npm run test:kyc  |  or via npm run test:agents
 *
 * Soft-imports optional modules so partial checkouts still exercise what is present.
 */
import { createHmac } from "node:crypto";
import { isValidCpf, isValidCnpj } from "../lib/validators/cpf-cnpj";
import { encryptBuffer, decryptBuffer, maskCpf } from "../lib/crypto/vault-crypto";
import { detectMime } from "../lib/vault/magic-bytes";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

async function softImport<T = Record<string, unknown>>(relPath: string): Promise<T | null> {
  try {
    return (await import(relPath)) as T;
  } catch (e) {
    console.log(
      `skip: module not available (${relPath}) — ${(e as Error).message?.slice(0, 80) ?? e}`,
    );
    return null;
  }
}

async function main() {
  // ── CPF / CNPJ ────────────────────────────────────────────────────────────
  assert(isValidCpf("529.982.247-25") === true, "isValidCpf true for 529.982.247-25");
  assert(isValidCpf("111.111.111-11") === false, "isValidCpf false for 111.111.111-11");
  assert(isValidCpf("52998224725") === true, "isValidCpf accepts digits-only valid CPF");

  assert(isValidCnpj("11.222.333/0001-81") === true, "isValidCnpj true for 11.222.333/0001-81");
  assert(isValidCnpj("11.111.111/1111-11") === false, "isValidCnpj false for all-same digits");
  assert(isValidCnpj("00000000000000") === false, "isValidCnpj false for zeros");
  assert(isValidCnpj("11222333000181") === true, "isValidCnpj digits-only valid");

  // ── Vault AES roundtrip ───────────────────────────────────────────────────
  const SMOKE_SECRET = "test-secret-key-for-smoke";
  const plain = Buffer.from("documento-sensivel-fenix-kyc-smoke", "utf8");
  const enc = encryptBuffer(plain, SMOKE_SECRET);
  assert(
    typeof enc.ciphertextB64 === "string" && enc.ciphertextB64.length > 20,
    "encryptBuffer produces ciphertext",
  );
  assert(enc.alg === "aes-256-gcm", "encryptBuffer alg aes-256-gcm");
  const dec = decryptBuffer(enc, SMOKE_SECRET);
  assert(Buffer.compare(dec, plain) === 0, "encryptBuffer/decryptBuffer roundtrip");
  assert(!enc.ciphertextB64.includes("documento-sensivel"), "ciphertext does not embed plaintext");

  // ── Magic bytes ───────────────────────────────────────────────────────────
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const pdf = Buffer.from([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xff, 0xff,
  ]);
  assert(detectMime(jpeg) === "image/jpeg", "detectMime JPEG");
  assert(detectMime(png) === "image/png", "detectMime PNG");
  assert(detectMime(pdf) === "application/pdf", "detectMime PDF");

  // ── maskCpf (LGPD — never full CPF in logs) ────────────────────────────────
  const masked = maskCpf("529.982.247-25");
  assert(masked.includes("***"), "maskCpf contains mask");
  assert(!masked.includes("982") && !masked.includes("247"), "maskCpf never prints full middle digits");
  assert(masked.startsWith("529") && masked.endsWith("25"), "maskCpf keeps first3 + last2");
  assert(maskCpf("123") === "***", "maskCpf short input → ***");
  assert(!/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(masked), "maskCpf not full formatted CPF");

  // ── DocCheck (optional soft) ─────────────────────────────────────────────
  const doccheckMod = await softImport<{
    runDocCheck: (input: {
      text?: string;
      kind?: string;
      cadastro?: { nome: string; cpf: string; dataNascimento?: string };
    }) => {
      band: string;
      campos: Record<string, { value: string | null }>;
      fraudScore: number;
      publicChannels: string[];
      audit: { agent: string; requiresLawyerReview: boolean };
      summary: string;
    };
  }>("../lib/agents/doccheck");

  if (doccheckMod?.runDocCheck) {
    const cnhSample = `
    REPÚBLICA FEDERATIVA DO BRASIL
    CARTEIRA NACIONAL DE HABILITAÇÃO
    NOME: MARINA OLIVEIRA SANTOS
    FILIAÇÃO: ANA OLIVEIRA
    N° REGISTRO: 01234567890
    CPF: 529.982.247-25
    CAT. HAB.: B
    VALIDADE: 15/08/2030
    DATA DE NASCIMENTO: 12/03/1990
  `;
    const dc = doccheckMod.runDocCheck({
      text: cnhSample,
      kind: "cnh",
      cadastro: {
        nome: "Marina Oliveira Santos",
        cpf: "529.982.247-25",
        dataNascimento: "12/03/1990",
      },
    });
    assert(dc.campos.cpf?.value != null, "runDocCheck CNH extrai CPF");
    assert(
      dc.campos.numeroRegistro?.value != null || dc.campos.categoria?.value != null,
      "runDocCheck CNH extrai registro/categoria",
    );
    assert(typeof dc.fraudScore === "number", "runDocCheck fraudScore numérico");
    assert(dc.publicChannels.length > 0, "runDocCheck lista canais públicos");
    assert(dc.audit.agent === "doccheck", "runDocCheck audit agent=doccheck");
    assert(!dc.summary.toLowerCase().includes("vamos ganhar"), "runDocCheck sem promessa de resultado");
  } else {
    console.log("skip: runDocCheck assertions (module missing)");
  }

  // ── CNH agent (optional soft) ─────────────────────────────────────────────
  const cnhMod = await softImport<{
    runCnh: (input: {
      service: string;
      uf?: string;
      relato?: string;
      multa?: {
        autoInfracao?: string;
        dataNotificacao?: string;
        etapa?: string;
        orgao?: string;
      };
    }) => {
      band: string;
      publicChannels: string[];
      minutaSugerida?: { corpo: string; requiresFenixButton: boolean };
      audit: { requiresLawyerReview: boolean };
      checklist: string[];
    };
  }>("../lib/agents/cnh");

  if (cnhMod?.runCnh) {
    const perda = cnhMod.runCnh({
      service: "perda_roubo_extravio",
      uf: "SP",
      relato: "Perdi a carteira no metrô",
    });
    assert(perda.publicChannels.length > 0, "runCnh perda_roubo → publicChannels");
    assert(
      perda.publicChannels.some((c) => /DETRAN|gov\.br|CDT/i.test(c)),
      "runCnh perda cita canal público DETRAN/gov.br",
    );
    assert(perda.checklist.length >= 2, "runCnh perda checklist");

    const multa = cnhMod.runCnh({
      service: "recurso_multa",
      uf: "SP",
      relato: "Sinalização ausente no local do radar",
      multa: {
        autoInfracao: "A123456789",
        dataNotificacao: "01/03/2026",
        etapa: "defesa_previa",
        orgao: "DETRAN-SP",
      },
    });
    assert(multa.publicChannels.length > 0, "runCnh recurso_multa → publicChannels");
    assert(multa.minutaSugerida != null, "runCnh recurso_multa gera minuta");
    const corpo = multa.minutaSugerida?.corpo ?? "";
    assert(
      /Botão Fênix|REVISÃO|ADVOGADO/i.test(corpo) ||
        multa.minutaSugerida?.requiresFenixButton === true,
      "runCnh multa draft marca Botão Fênix / revisão",
    );
    assert(
      multa.audit.requiresLawyerReview === true ||
        multa.band === "amarela" ||
        multa.band === "vermelha",
      "runCnh multa exige revisão",
    );
  } else {
    console.log("skip: runCnh assertions (module missing)");
  }

  // ── KYC provider mock (optional soft) ─────────────────────────────────────
  const kycMod = await softImport<{
    getKycProvider: () => {
      name: string;
      liveness: (input: { mode: string; challenge?: string }) => Promise<unknown>;
      faceMatch: (input: {
        selfieMetaId?: string;
        documentMetaId?: string;
        scores?: { face?: number };
      }) => Promise<unknown>;
    };
  }>("../lib/kyc/provider");

  if (kycMod?.getKycProvider) {
    process.env.KYC_PROVIDER = "mock";
    const provider = kycMod.getKycProvider();
    const live = await provider.liveness({ mode: "passive", challenge: "blink" });
    const face = await provider.faceMatch({
      selfieMetaId: "meta_selfie_smoke",
      documentMetaId: "meta_doc_smoke",
      scores: { face: 0.91 },
    });
    const liveJson = JSON.stringify(live);
    const faceJson = JSON.stringify(face);
    assert(!/data:image\//i.test(liveJson), "liveness result sem data:image");
    assert(!/data:image\//i.test(faceJson), "faceMatch result sem data:image");
    assert(!/"imageBase64"/i.test(liveJson + faceJson), "KYC result sem imageBase64");
    assert(!/"rawImage"/i.test(liveJson + faceJson), "KYC result sem rawImage");
    assert(!/iVBORw0KGgo|\/9j\//.test(liveJson + faceJson), "KYC result sem bytes base64 de imagem");
    assert(typeof live === "object" && live != null, "liveness retorna objeto");
    assert(typeof face === "object" && face != null, "faceMatch retorna objeto");
    const liveObj = live as {
      livenessScore?: number | null;
      band?: string;
      requiresLawyerReview?: boolean;
    };
    const faceObj = face as { faceMatchScore?: number | null; status?: string };
    assert(
      liveObj.livenessScore == null || typeof liveObj.livenessScore === "number",
      "livenessScore numérico ou null",
    );
    assert(
      faceObj.faceMatchScore == null || typeof faceObj.faceMatchScore === "number",
      "faceMatchScore numérico ou null",
    );
  } else {
    console.log("skip: getKycProvider assertions (module missing)");
  }

  // ── AbacatePay webhook HMAC (optional soft) ───────────────────────────────
  const payMod = await softImport<{
    verifyWebhookSignature: (
      rawBody: string,
      signatureHeader: string | null,
      secret: string,
    ) => boolean;
  }>("../lib/abacatepay");

  if (payMod?.verifyWebhookSignature) {
    const secret = "smoke-abacate-webhook-secret";
    const body = JSON.stringify({
      id: "evt_smoke_1",
      type: "billing.paid",
      data: { amount: 9900 },
    });
    const goodB64 = createHmac("sha256", secret).update(body, "utf8").digest("base64");
    const goodHex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    assert(
      payMod.verifyWebhookSignature(body, goodB64, secret) === true,
      "verifyWebhookSignature valid base64",
    );
    assert(
      payMod.verifyWebhookSignature(body, goodHex, secret) === true,
      "verifyWebhookSignature valid hex",
    );
    assert(
      payMod.verifyWebhookSignature(body, "sha256=" + goodB64, secret) === true,
      "verifyWebhookSignature sha256= prefix",
    );
    assert(
      payMod.verifyWebhookSignature(body, "invalid-sig", secret) === false,
      "verifyWebhookSignature rejects bad sig",
    );
    assert(
      payMod.verifyWebhookSignature(body, null, secret) === false,
      "verifyWebhookSignature null header → false",
    );
    assert(
      payMod.verifyWebhookSignature(body, goodB64, "") === false,
      "verifyWebhookSignature empty secret → false",
    );
  } else {
    console.log("skip: verifyWebhookSignature assertions (module missing)");
  }

  // ── Password hash cost (optional soft) ────────────────────────────────────
  const pwdMod = await softImport<{
    hashPassword: (plain: string) => Promise<string>;
    BCRYPT_COST?: number;
    verifyPassword?: (plain: string, hash: string) => Promise<boolean>;
  }>("../lib/auth/password");

  if (pwdMod?.hashPassword) {
    const hash = await pwdMod.hashPassword("fenix-smoke-pwd-!@#");
    assert(hash.startsWith("$2"), "hashPassword starts with $2 (bcrypt)");
    const costMatch = hash.match(/^\$2[aby]?\$(\d{2})\$/);
    assert(costMatch != null, "hashPassword has bcrypt cost segment");
    if (costMatch) {
      const cost = parseInt(costMatch[1], 10);
      assert(cost >= 12, `hashPassword cost ≥ 12 (got ${cost})`);
    }
    if (typeof pwdMod.BCRYPT_COST === "number") {
      assert(pwdMod.BCRYPT_COST >= 12, "BCRYPT_COST constant ≥ 12");
    }
    if (pwdMod.verifyPassword) {
      const ok = await pwdMod.verifyPassword("fenix-smoke-pwd-!@#", hash);
      assert(ok === true, "verifyPassword accepts correct password");
      const bad = await pwdMod.verifyPassword("wrong-password", hash);
      assert(bad === false, "verifyPassword rejects wrong password");
    }
  } else {
    console.log("skip: hashPassword assertions (module missing)");
  }

  // ── Final ─────────────────────────────────────────────────────────────────
  if (failed) {
    console.error(`\n${failed} KYC assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll KYC smoke tests passed.");
}

main().catch((err) => {
  console.error("smoke-kyc crashed:", err);
  process.exit(1);
});
