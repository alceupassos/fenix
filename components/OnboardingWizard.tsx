"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";

export type WizardStepId = "dados" | "documentos" | "facial" | "pronto";

const STEPS: { id: WizardStepId; label: string; short: string }[] = [
  { id: "dados", label: "Seus dados", short: "Dados" },
  { id: "documentos", label: "Documentos", short: "Docs" },
  { id: "facial", label: "Verificação", short: "Facial" },
  { id: "pronto", label: "Pronto", short: "Pronto" },
];

function stepIndex(id: WizardStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

type Profile = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  onboardingStep?: string | null;
  verificationStatus?: string | null;
  cpfMasked?: string | null;
};

export default function OnboardingWizard() {
  const [active, setActive] = useState<WizardStepId>("dados");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; profile?: Profile };
      if (data.profile) {
        setProfile(data.profile);
        const step = data.profile.onboardingStep;
        if (step === "dados" || step === "documentos" || step === "facial" || step === "pronto") {
          setActive(step);
        }
      }
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function advanceTo(next: WizardStepId) {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingStep: next }),
      });
      if (res.ok) {
        setActive(next);
        setProfile((p) => (p ? { ...p, onboardingStep: next } : p));
      } else if (res.status === 401) {
        // Allow local navigation without session (middleware gates later)
        setActive(next);
      } else {
        setMsg("Não foi possível salvar o progresso. Você ainda pode continuar.");
        setActive(next);
      }
    } catch {
      setActive(next);
    } finally {
      setSaving(false);
    }
  }

  const idx = stepIndex(active);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0C1D3E 0%, #102A54 55%, #0C1D3E 100%)",
        padding: "40px 18px 64px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <Brand color="#fff" accent="#5EE0E0" />
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 28,
            padding: "clamp(22px, 4vw, 36px)",
            boxShadow: "0 40px 90px rgba(4,12,30,.45)",
            animation: "fxUp .4s ease both",
          }}
        >
          <h1
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "-.02em",
              margin: "0 0 6px",
              color: "#13233F",
            }}
          >
            Seu caminho de recomeço
          </h1>
          <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "#54627F", lineHeight: 1.5 }}>
            {profile?.name
              ? `${profile.name}, vamos no seu ritmo — dados, documentos e verificação quando fizer sentido.`
              : "Quatro passos leves. Você pode pausar e voltar quando quiser."}
          </p>

          {/* Progress chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 28,
            }}
          >
            {STEPS.map((s, i) => {
              const done = i < idx;
              const current = i === idx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  style={{
                    font: "inherit",
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontSize: 12.5,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: current
                      ? "var(--grad-orange)"
                      : done
                        ? "rgba(18,165,165,.14)"
                        : "#F5F7FB",
                    color: current ? "#fff" : done ? "#0E8A8A" : "#657493",
                    boxShadow: current ? "0 8px 18px rgba(238,110,69,.3)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      background: current
                        ? "rgba(255,255,255,.25)"
                        : done
                          ? "#12A5A5"
                          : "rgba(19,35,63,.08)",
                      color: current || done ? "#fff" : "#657493",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {s.short}
                </button>
              );
            })}
          </div>

          {loading && (
            <p style={{ fontSize: 13, color: "#657493", marginBottom: 16 }}>Carregando seu perfil…</p>
          )}

          {msg && (
            <div
              style={{
                background: "#FFF6ED",
                color: "#C2451F",
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 14,
              }}
            >
              {msg}
            </div>
          )}

          {active === "dados" && (
            <StepCard
              title="1 · Seus dados"
              body="Cadastro básico concluído (ou em andamento). Confira se telefone e e-mail estão corretos — é por eles que a Clara e o Vigia falam com você."
            >
              <ul style={listStyle}>
                <li>Nome e e-mail protegidos na sua conta</li>
                <li>CPF usado só para identificação segura {profile?.cpfMasked ? `(${profile.cpfMasked})` : ""}</li>
                <li>Status: {profile?.verificationStatus === "verificado" ? "verificado" : "ainda não verificado"}</li>
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                <PrimaryBtn disabled={saving} onClick={() => void advanceTo("documentos")}>
                  Continuar para documentos
                </PrimaryBtn>
                <GhostLink href="/cadastro">Revisar cadastro</GhostLink>
              </div>
            </StepCard>
          )}

          {active === "documentos" && (
            <StepCard
              title="2 · Documentos no cofre"
              body="Guarde RG, CNH ou comprovantes no cofre criptografado. A Íris organiza o que importa — com o seu consentimento de documentos."
            >
              <ul style={listStyle}>
                <li>Arquivos criptografados (AES-256)</li>
                <li>Consentimento específico para documentos (LGPD)</li>
                <li>Você decide o que enviar e quando apagar</li>
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                <PrimaryLink href="/painel">Abrir cofre no painel</PrimaryLink>
                <PrimaryBtn disabled={saving} onClick={() => void advanceTo("facial")} tone="teal">
                  Já enviei — seguir
                </PrimaryBtn>
                <GhostBtn onClick={() => void advanceTo("facial")}>Fazer depois</GhostBtn>
              </div>
            </StepCard>
          )}

          {active === "facial" && (
            <StepCard
              title="3 · Verificação facial"
              body="Quando precisar de mais segurança (contratos, negociações sensíveis), a verificação confirma que é você. A biometria só roda com consentimento explícito."
            >
              <ul style={listStyle}>
                <li>Sem biometria obrigatória só para explorar o portal</li>
                <li>Consentimento de biometria versionado e revogável</li>
                <li>A IA prepara; decisões com efeito jurídico passam pelo advogado</li>
              </ul>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                <PrimaryLink href="/kyc">Ir para verificação (KYC)</PrimaryLink>
                <PrimaryBtn disabled={saving} onClick={() => void advanceTo("pronto")} tone="teal">
                  Concluir onboarding
                </PrimaryBtn>
                <GhostBtn onClick={() => void advanceTo("pronto")}>Pular por agora</GhostBtn>
              </div>
            </StepCard>
          )}

          {active === "pronto" && (
            <StepCard
              title="4 · Você está no caminho"
              body="Pronto para o Mapa de Recomeço. A Clara te escuta, o Farol trata urgências, e o painel reúne dívidas, prazos e documentos."
            >
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(18,165,165,.1), rgba(238,110,69,.08))",
                  borderRadius: 16,
                  padding: "16px 18px",
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#13233F" }}>
                  Você não precisa enfrentar tudo isso sozinho.
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#54627F", lineHeight: 1.5 }}>
                  Comece pelo que está tirando o seu sono — o resto a gente organiza juntos.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                <PrimaryLink href="/chat">Falar com a Clara</PrimaryLink>
                <PrimaryLink href="/painel" tone="teal">
                  Ir ao painel
                </PrimaryLink>
                <GhostLink href="/">Página inicial</GhostLink>
              </div>
            </StepCard>
          )}
        </div>
      </div>
    </div>
  );
}

const listStyle: React.CSSProperties = {
  margin: "10px 0 0",
  paddingLeft: 18,
  color: "#3E4E6C",
  fontSize: 13.5,
  lineHeight: 1.6,
};

function StepCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#13233F" }}>
        {title}
      </h2>
      <p style={{ margin: 0, fontSize: 13.5, color: "#54627F", lineHeight: 1.55 }}>{body}</p>
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  tone = "orange",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "orange" | "teal";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-btn-lift1"
      style={{
        font: "inherit",
        fontSize: 14,
        fontWeight: 800,
        cursor: disabled ? "default" : "pointer",
        border: "none",
        borderRadius: 999,
        padding: "12px 18px",
        color: "#fff",
        background: tone === "teal" ? "var(--grad-teal)" : "var(--grad-orange)",
        boxShadow:
          tone === "teal" ? "0 10px 22px rgba(18,165,165,.35)" : "0 10px 22px rgba(238,110,69,.35)",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  );
}

function PrimaryLink({
  href,
  children,
  tone = "orange",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "orange" | "teal";
}) {
  return (
    <Link
      href={href}
      className="h-btn-lift1"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        fontWeight: 800,
        textDecoration: "none",
        borderRadius: 999,
        padding: "12px 18px",
        color: "#fff",
        background: tone === "teal" ? "var(--grad-teal)" : "var(--grad-orange)",
        boxShadow:
          tone === "teal" ? "0 10px 22px rgba(18,165,165,.35)" : "0 10px 22px rgba(238,110,69,.35)",
      }}
    >
      {children}
      <Icon name="arrowRight" size={15} strokeWidth={2.75} />
    </Link>
  );
}

function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 13.5,
        fontWeight: 700,
        color: "#0E8A8A",
        textDecoration: "none",
        padding: "12px 14px",
      }}
    >
      {children}
    </Link>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        font: "inherit",
        cursor: "pointer",
        background: "none",
        border: "1.5px solid rgba(19,35,63,.12)",
        borderRadius: 999,
        padding: "11px 16px",
        fontSize: 13.5,
        fontWeight: 700,
        color: "#54627F",
      }}
    >
      {children}
    </button>
  );
}
