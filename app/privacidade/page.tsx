import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacidade e LGPD — Sociedade Fênix",
  description: "Como a Sociedade Fênix trata dados pessoais, consentimento, retenção e seus direitos.",
};

const section: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.07)",
  borderRadius: 20,
  padding: "22px 24px",
  marginBottom: 14,
};

export default function PrivacidadePage() {
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
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", textDecoration: "none" }}>
          <Image src="/fenix-mark.png" alt="" width={28} height={26} />
          <span className="font-display" style={{ fontWeight: 800 }}>Sociedade Fênix</span>
        </Link>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px 18px 64px" }}>
        <h1 className="font-display" style={{ fontWeight: 800, fontSize: 32, letterSpacing: "-.02em", margin: "0 0 8px" }}>
          Privacidade e LGPD
        </h1>
        <p style={{ color: "#54627F", lineHeight: 1.6, marginBottom: 24 }}>
          Sociedade Fênix Tecnologia trata dados para organizar sua recuperação financeira, jurídica e
          administrativa. Não vendemos dados. Não recebemos comissão de credores.
        </p>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px" }}>Finalidades</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            <li>Montar o Mapa de Recomeço e acompanhar prazos</li>
            <li>Preparar documentos e reclamações com sua autorização</li>
            <li>Encaminhar ao advogado parceiro o que exige responsabilidade jurídica</li>
            <li>Cobrança de assinatura/pacotes via Stripe</li>
          </ul>
        </div>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px" }}>Princípios</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            <li><strong>Minimização</strong> — só o necessário para o serviço</li>
            <li><strong>Consentimento</strong> — nada protocolado sem você autorizar</li>
            <li><strong>Não vender dados</strong> — nunca</li>
            <li><strong>Sem senha gov.br/banco</strong> — a plataforma não solicita</li>
            <li><strong>Trilha de auditoria</strong> — medidas jurídicas registram quem aprovou</li>
          </ul>
        </div>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px" }}>Seus direitos (LGPD)</h2>
          <p style={{ margin: 0, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            Acesso, correção, portabilidade, eliminação, informação sobre compartilhamentos e revogação de
            consentimento. Canal:{" "}
            <a href="mailto:privacidade@sociedadefenix.com.br">privacidade@sociedadefenix.com.br</a>
            {" "}(placeholder — configure o endereço real em produção).
          </p>
        </div>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px" }}>Retenção e exclusão</h2>
          <p style={{ margin: 0, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            Documentos do cofre permanecem enquanto a conta estiver ativa ou pelo prazo legal exigido em
            contencioso. Você pode solicitar exclusão; registros de auditoria de atos jurídicos podem ser
            mantidos pelo prazo necessário à comprovação da atuação profissional.
          </p>
        </div>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px" }}>2FA e segurança</h2>
          <p style={{ margin: 0, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            Autenticação em dois fatores está no roadmap de endurecimento (TOTP). Enquanto isso, use senha
            forte e não compartilhe o acesso. Criptografia em trânsito (TLS) em produção; cofre com trilha de
            acesso.
          </p>
        </div>

        <div style={section}>
          <h2 className="font-display" style={{ fontSize: 18, margin: "0 0 10px" }}>Separação OAB</h2>
          <p style={{ margin: 0, color: "#3E4E6C", lineHeight: 1.65, fontSize: 14.5 }}>
            Serviços de tecnologia: Sociedade Fênix Tecnologia. Serviços advocatícios: contratados diretamente
            com a advocacia parceira, com profissional identificado no Botão Fênix.
          </p>
        </div>

        <Link href="/" style={{ fontWeight: 700, fontSize: 14 }}>
          ← Página inicial
        </Link>
      </main>
    </div>
  );
}
