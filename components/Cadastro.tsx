"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";

/** Mirrors CONSENT_TERM_VERSION — keep in sync with lib/kyc-contracts.ts */
const TERM_VERSION = "2026-07-kyc-1.0";

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  font: "inherit",
  fontWeight: 500,
  fontSize: 15,
  height: 46,
  padding: "0 16px",
  border: "1.5px solid rgba(19,35,63,.12)",
  borderRadius: 14,
  background: "#F5F7FB",
  color: "#13233F",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "#3E4E6C",
};

function formatCpfInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhoneInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

type ConsentsState = {
  termos_uso: boolean;
  privacidade: boolean;
  comunicacao: boolean;
  marketing: boolean;
};

export default function Cadastro() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [consents, setConsents] = useState<ConsentsState>({
    termos_uso: false,
    privacidade: false,
    comunicacao: false,
    marketing: false,
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      name.trim().length >= 2 &&
      email.trim().includes("@") &&
      phone.replace(/\D/g, "").length >= 10 &&
      cpf.replace(/\D/g, "").length === 11 &&
      password.length >= 8 &&
      password === password2 &&
      consents.termos_uso &&
      consents.privacidade &&
      !busy
    );
  }, [name, email, phone, cpf, password, password2, consents, busy]);

  async function submit() {
    setError("");
    if (password !== password2) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!consents.termos_uso || !consents.privacidade) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone,
          cpf,
          password,
          consents: {
            termos_uso: consents.termos_uso,
            privacidade: consents.privacidade,
            comunicacao: consents.comunicacao || undefined,
            marketing: consents.marketing || undefined,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        userId?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível concluir o cadastro. Tente novamente.");
        setBusy(false);
        return;
      }
      setCreatedId(data.userId ?? null);
      setStep(2);
    } catch {
      setError("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0C1D3E, #102A54)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 22px",
      }}
    >
      <div
        style={{
          width: "min(480px, 100%)",
          background: "#fff",
          borderRadius: 28,
          padding: "clamp(26px, 5vw, 40px)",
          boxShadow: "0 40px 90px rgba(4,12,30,.5)",
          animation: "fxUp .4s ease both",
        }}
      >
        <Brand />

        {step === 1 ? (
          <>
            <h1
              className="font-display"
              style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "22px 0 4px", color: "#13233F" }}
            >
              Criar sua conta
            </h1>
            <p style={{ fontSize: 13.5, color: "#54627F", margin: "0 0 8px", lineHeight: 1.5 }}>
              Um espaço seguro para organizar o recomeço. Seus dados ficam protegidos — usamos só o
              necessário para te acompanhar.
            </p>
            <p style={{ fontSize: 11.5, color: "#657493", margin: "0 0 20px" }}>
              Versão dos termos: <strong style={{ color: "#3E4E6C" }}>{TERM_VERSION}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) void submit();
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label style={labelStyle}>
                Nome completo
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como você gosta de ser chamado(a)"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  style={inputStyle}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={labelStyle}>
                  Telefone
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    placeholder="(11) 98765-4321"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  CPF
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                    placeholder="000.000.000-00"
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={labelStyle}>
                Senha
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Confirmar senha
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Repita a senha"
                  style={inputStyle}
                />
              </label>

              <div
                style={{
                  marginTop: 4,
                  padding: "14px 16px",
                  borderRadius: 16,
                  background: "#F5F7FB",
                  border: "1px solid rgba(19,35,63,.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#13233F" }}>
                  Consentimentos (LGPD)
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#54627F", lineHeight: 1.45 }}>
                  Você controla o que compartilha. Obrigatórios só o essencial para abrir a conta.
                </p>

                <ConsentCheck
                  checked={consents.termos_uso}
                  onChange={(v) => setConsents((c) => ({ ...c, termos_uso: v }))}
                  required
                  label={
                    <>
                      Li e aceito os{" "}
                      <Link href="/privacidade" style={{ color: "#0E8A8A", fontWeight: 700 }}>
                        Termos de Uso
                      </Link>
                    </>
                  }
                />
                <ConsentCheck
                  checked={consents.privacidade}
                  onChange={(v) => setConsents((c) => ({ ...c, privacidade: v }))}
                  required
                  label={
                    <>
                      Concordo com a{" "}
                      <Link href="/privacidade" style={{ color: "#0E8A8A", fontWeight: 700 }}>
                        Política de Privacidade
                      </Link>
                    </>
                  }
                />
                <ConsentCheck
                  checked={consents.comunicacao}
                  onChange={(v) => setConsents((c) => ({ ...c, comunicacao: v }))}
                  label="Quero receber avisos importantes por e-mail ou WhatsApp (prazos, lembretes)."
                />
                <ConsentCheck
                  checked={consents.marketing}
                  onChange={(v) => setConsents((c) => ({ ...c, marketing: v }))}
                  label="Aceito conteúdos e novidades opcionais (pode desligar a qualquer momento)."
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "#FDEDE7",
                    color: "#C2451F",
                    fontSize: 12.5,
                    fontWeight: 600,
                    borderRadius: 12,
                    padding: "10px 14px",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="h-btn-lift1"
                style={{
                  font: "inherit",
                  marginTop: 4,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: canSubmit ? "pointer" : "default",
                  border: "none",
                  borderRadius: 999,
                  padding: "14px 22px",
                  color: "#fff",
                  background: "var(--grad-orange)",
                  boxShadow: "0 10px 26px rgba(238,110,69,.4)",
                  opacity: canSubmit ? 1 : 0.55,
                }}
              >
                {busy ? "Criando conta…" : "Criar conta com segurança"}
              </button>
            </form>

            <p style={{ textAlign: "center", margin: "18px 0 0", fontSize: 13.5, color: "#54627F" }}>
              Já tem conta?{" "}
              <Link href="/login" style={{ color: "#0E8A8A", fontWeight: 800, textDecoration: "none" }}>
                Entrar
              </Link>
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #12A5A5, #0E8A8A)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "22px 0 14px",
                boxShadow: "0 12px 28px rgba(18,165,165,.35)",
              }}
            >
              <Icon name="check" size={28} strokeWidth={2.75} />
            </div>
            <h1
              className="font-display"
              style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "0 0 8px", color: "#13233F" }}
            >
              Conta criada
            </h1>
            <p style={{ fontSize: 14, color: "#54627F", margin: "0 0 8px", lineHeight: 1.55 }}>
              Bem-vindo(a) à Sociedade Fênix. O próximo passo é entrar e seguir o guia de onboarding —
              documentos e verificação quando você estiver pronto(a).
            </p>
            {createdId && (
              <p style={{ fontSize: 11.5, color: "#657493", margin: "0 0 22px" }}>
                Referência: <code style={{ fontSize: 11 }}>{createdId}</code>
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="h-btn-lift1"
                style={{
                  font: "inherit",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: 999,
                  padding: "14px 22px",
                  color: "#fff",
                  background: "var(--grad-orange)",
                  boxShadow: "0 10px 26px rgba(238,110,69,.4)",
                }}
              >
                Ir para o login
              </button>
              <Link
                href="/onboarding"
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#0E8A8A",
                  textDecoration: "none",
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1.5px solid rgba(14,138,138,.35)",
                  background: "#fff",
                }}
              >
                Continuar para o onboarding
              </Link>
            </div>

            <p style={{ fontSize: 12, color: "#657493", margin: "18px 0 0", lineHeight: 1.5 }}>
              Você não precisa enfrentar tudo sozinho. Vamos no seu ritmo — um passo de cada vez.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          style={{
            font: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
            margin: "20px auto 0",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            background: "none",
            border: "none",
            color: "#54627F",
          }}
        >
          <Icon name="arrowLeft" size={15} strokeWidth={2.75} />
          Voltar para a página inicial
        </button>
      </div>
    </div>
  );
}

function ConsentCheck({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        cursor: "pointer",
        fontSize: 12.5,
        color: "#3E4E6C",
        lineHeight: 1.45,
        fontWeight: 500,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, width: 16, height: 16, accentColor: "#12A5A5", flex: "none" }}
      />
      <span>
        {label}
        {required && (
          <span style={{ color: "#EE6E45", fontWeight: 800, marginLeft: 4 }}>*</span>
        )}
      </span>
    </label>
  );
}
