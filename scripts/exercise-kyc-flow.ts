/**
 * Manual exercise of vault + doccheck + cnh + kyc mock (no HTTP).
 */
import { runDocCheck } from "../lib/agents/doccheck";
import { runCnh } from "../lib/agents/cnh";
import { getKycProvider } from "../lib/kyc/provider";
import {
  storeVaultFile,
  listVaultFiles,
  readVaultFile,
  deleteVaultFile,
} from "../lib/vault";
import { detectMime } from "../lib/vault/magic-bytes";

process.env.KEY_VAULTS_SECRET = process.env.KEY_VAULTS_SECRET || "test-dev-secret-key-fenix";

async function main() {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64, 1),
  ]);
  console.log("mime", detectMime(png));

  const stored = await storeVaultFile("u_test", "rg", png, "rg.png", { actor: "test" });
  const meta = stored.meta;
  console.log("vault", meta.id, meta.encrypted, meta.mime);
  console.log("list", listVaultFiles("u_test").length);

  const read = await readVaultFile(meta.id, { userId: "u_test", actor: "test" });
  console.log("read", read?.buffer.length);
  await deleteVaultFile("u_test", meta.id, { actor: "test" });

  const dc = runDocCheck({
    text:
      "CARTEIRA NACIONAL DE HABILITACAO Nome: MARINA OLIVEIRA SANTOS CPF: 529.982.247-25 Registro: 12345678900 Categoria: B Validade: 15/03/2030",
    kind: "cnh",
    cadastro: { nome: "Marina Oliveira Santos", cpf: "529.982.247-25" },
  });
  console.log("doccheck", dc.band, dc.crossCheck.cpfMatch, dc.fraudScore);

  const cnh = runCnh({ service: "recurso_multa", uf: "SP", multa: { etapa: "jari" } });
  console.log("cnh", cnh.band, !!cnh.minutaSugerida, cnh.publicChannels?.length);

  const kyc = getKycProvider();
  const live = await kyc.liveness({ mode: "passive" });
  const face = await kyc.faceMatch({});
  console.log("kyc", kyc.name, live.status, face.faceMatchScore);
  console.log("ALL_FLOW_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
