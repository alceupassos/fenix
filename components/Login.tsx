"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/painel";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(mail: string, pass: string, dest?: string) {
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { email: mail, password: pass, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push(dest || callbackUrl);
    router.refresh();
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
          width: "min(440px, 100%)",
          background: "#fff",
          borderRadius: 28,
          padding: "clamp(26px, 5vw, 40px)",
          boxShadow: "0 40px 90px rgba(4,12,30,.5)",
          animation: "fxUp .4s ease both",
        }}
      >
        <Brand />
        <h1
          className="font-display"
          style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", margin: "22px 0 4px" }}
        >
          Entrar na sua conta
        </h1>
        <p style={{ fontSize: 13.5, color: "#6B7A96", margin: "0 0 22px" }}>
          Acesse o seu Mapa de Recomeço. Seus dados ficam protegidos e criptografados.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim() && password) submit(email.trim(), password);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#3E4E6C" }}>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#3E4E6C" }}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </label>

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
            disabled={busy}
            className="h-btn-lift1"
            style={{
              font: "inherit",
              marginTop: 4,
              fontSize: 15,
              fontWeight: 800,
              cursor: busy ? "default" : "pointer",
              border: "none",
              borderRadius: 999,
              padding: "14px 22px",
              color: "#fff",
              background: "var(--grad-orange)",
              boxShadow: "0 10px 26px rgba(238,110,69,.4)",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Entrar
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(19,35,63,.1)" }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#8A97AE", textTransform: "uppercase", letterSpacing: ".08em" }}>
            Entrar como demonstração
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(19,35,63,.1)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={() => submit("marina@fenix.com.br", "fenix123", "/painel")}
            disabled={busy}
            className="h-btn-teal-outline"
            style={demoBtn}
          >
            <span
              style={{
                width: 34, height: 34, borderRadius: "50%", flex: "none",
                background: "var(--grad-orange)", color: "#fff", display: "flex",
                alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
              }}
            >
              M
            </span>
            <span style={{ textAlign: "left", lineHeight: 1.3 }}>
              <strong style={{ display: "block", fontSize: 14, color: "#13233F" }}>Marina — usuária</strong>
              <span style={{ fontSize: 12, color: "#6B7A96" }}>ver o Painel do usuário</span>
            </span>
          </button>
          <button
            onClick={() => submit("leandro@fenix.com.br", "fenix123", "/advogado")}
            disabled={busy}
            className="h-btn-teal-outline"
            style={demoBtn}
          >
            <span
              style={{
                width: 34, height: 34, borderRadius: "50%", flex: "none",
                background: "var(--grad-teal)", color: "#fff", display: "flex",
                alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
              }}
            >
              L
            </span>
            <span style={{ textAlign: "left", lineHeight: 1.3 }}>
              <strong style={{ display: "block", fontSize: 14, color: "#13233F" }}>Dr. Leandro — advogado</strong>
              <span style={{ fontSize: 12, color: "#6B7A96" }}>ver o Painel do advogado</span>
            </span>
          </button>
        </div>

        <button
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
            color: "#6B7A96",
          }}
        >
          <Icon name="arrowLeft" size={15} strokeWidth={2.75} />
          Voltar para a página inicial
        </button>
      </div>
    </div>
  );
}

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
};

const demoBtn: React.CSSProperties = {
  font: "inherit",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "#fff",
  border: "1.5px solid rgba(19,35,63,.1)",
  borderRadius: 16,
  padding: "11px 14px",
};
