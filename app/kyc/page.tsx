import Link from "next/link";
import Image from "next/image";
import KycCapture from "@/components/KycCapture";
import { RETENTION_DAYS } from "@/lib/kyc-contracts";

export const metadata = {
  title: "Verificação de identidade (KYC) — Sociedade Fênix",
  description:
    "Prova de vida, face match e passkey com minimização de dados biométricos (LGPD art. 11).",
};

const section: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
  borderRadius: 20,
  padding: "22px 24px",
  marginBottom: 14,
};

export default function KycPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F7FB" }}>
      <header
        style={{
          background: "#0C1D3E",
          color: "#fff",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none" }}
        >
          <Image src="/fenix-mark.png" alt="" width={28} height={26} />
          <span className="font-display" style={{ fontWeight: 800 }}>
            Sociedade Fênix
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 14, fontSize: 13.5 }}>
          <Link href="/painel" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none" }}>
            Painel
          </Link>
          <Link href="/privacidade" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none" }}>
            Privacidade
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px 18px 64px" }}>
        <p
          style={{
            display: "inline-block",
            background: "rgba(18,165,165,.12)",
            color: "#0F766E",
            fontWeight: 700,
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            marginBottom: 10,
          }}
        >
          Verificação segura · biometria mínima
        </p>
        <h1
          className="font-display"
          style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-.02em", margin: "0 0 8px", color: "#13233F" }}
        >
          Confirme que é você
        </h1>
        <p style={{ color: "#54627F", lineHeight: 1.6, marginBottom: 24 }}>
          A Sociedade Fênix usa verificação de identidade para proteger sua conta e atos sensíveis.
          A <strong>IA prepara</strong>; o <strong>advogado decide</strong> (Botão Fênix) o que tiver
          responsabilidade jurídica. Você não precisa enfrentar isso sozinho.
        </p>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px", color: "#13233F" }}>
            Aviso LGPD — dados sensíveis (art. 11)
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            <li>
              <strong>Base legal:</strong> consentimento específico para biometria (selfie, prova de
              vida, face match). Sem consentimento, a sessão KYC não inicia.
            </li>
            <li>
              <strong>Minimização:</strong> preferimos scores e status do provedor; não guardamos
              vídeo/selfie brutos em logs nem reenviamos a terceiros sem autorização.
            </li>
            <li>
              <strong>Retenção:</strong> sessão KYC até {RETENTION_DAYS.kycSession} dias; artefatos
              biométricos efêmeros até {RETENTION_DAYS.biometryArtifact} dias (quando existirem).
            </li>
            <li>
              <strong>Exclusão:</strong> use &quot;Excluir dados KYC&quot; nesta página ou solicite
              em{" "}
              <a href="mailto:privacidade@sociedadefenix.com.br">privacidade@sociedadefenix.com.br</a>.
            </li>
            <li>
              <strong>Não vendemos dados</strong> e não recebemos comissão de credores. Canais públicos
              gratuitos continuam disponíveis.
            </li>
          </ul>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#7A869E" }}>
            Saiba mais em{" "}
            <Link href="/privacidade" style={{ color: "#12A5A5" }}>
              Privacidade e LGPD
            </Link>
            .
          </p>
        </div>

        <KycCapture />
      </main>
    </div>
  );
}
