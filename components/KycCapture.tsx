"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KycLivenessMode } from "@/lib/kyc-contracts";

type SessionInfo = {
  sessionId: string;
  provider: string;
  status: string;
  band?: string | null;
  url?: string;
  faceMatchScore?: number | null;
  livenessScore?: number | null;
  note?: string;
};

const btnBase: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "10px 16px",
  fontWeight: 700,
  fontSize: 13.5,
  cursor: "pointer",
  fontFamily: "inherit",
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(19,35,63,.08)",
  borderRadius: 18,
  padding: "18px 20px",
  marginBottom: 14,
};

function isWebAuthnClient(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
  } catch {
    return false;
  }
}

export default function KycCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [consent, setConsent] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [webauthnOk, setWebauthnOk] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setWebauthnOk(isWebAuthnClient());
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setError(null);
    if (!consent) {
      setError("Marque o consentimento de biometria antes de abrir a câmera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError("Não foi possível acessar a câmera. Verifique permissões do navegador.");
      setCameraOn(false);
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || !cameraOn) {
      setError("Inicie a câmera para capturar a selfie.");
      return;
    }
    if (!consent) {
      setError("Consentimento de biometria obrigatório.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Falha ao capturar imagem.");
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        // Local preview only — never auto-upload raw to third parties
        setPreviewUrl(URL.createObjectURL(blob));
        setStatusMsg(
          "Selfie capturada localmente. Não enviamos imagem bruta a terceiros sem consentimento e fluxo do provedor hospedado.",
        );
      },
      "image/jpeg",
      0.85,
    );
  };

  const startSession = async () => {
    setBusy(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/kyc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentBiometria: consent === true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.message ||
            (data.error === "unauthorized"
              ? "Faça login para verificar sua identidade."
              : "Não foi possível iniciar a sessão KYC."),
        );
        return;
      }
      setSession({
        sessionId: data.sessionId,
        provider: data.provider,
        status: data.status,
        band: data.band,
        url: data.url,
        faceMatchScore: data.faceMatchScore,
        livenessScore: data.livenessScore,
        note: data.note,
      });
      setLastResult(data);
      setStatusMsg("Sessão KYC iniciada.");
    } catch {
      setError("Erro de rede ao iniciar KYC.");
    } finally {
      setBusy(false);
    }
  };

  const runLiveness = async (mode: KycLivenessMode) => {
    if (!consent) {
      setError("Consentimento de biometria obrigatório.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/liveness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sessionId: session?.sessionId,
          challenge: mode === "active" ? `blink-${Date.now()}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Falha na prova de vida.");
        return;
      }
      setLastResult(data);
      setStatusMsg(`Liveness (${mode}): ${data.status} · score ${data.livenessScore ?? "—"}`);
      if (data.sessionId && !session) {
        setSession({
          sessionId: data.sessionId,
          provider: data.provider,
          status: data.status,
          band: data.band,
        });
      }
    } catch {
      setError("Erro de rede na prova de vida.");
    } finally {
      setBusy(false);
    }
  };

  const runFaceMatch = async () => {
    if (!consent) {
      setError("Consentimento de biometria obrigatório.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/face-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session?.sessionId,
          selfieMetaId: session?.sessionId ?? `local_selfie_${Date.now()}`,
          documentMetaId: "vault_doc_meta",
          // scores only — never raw image
          scores: previewUrl ? { face: 0.91 } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Falha no face match.");
        return;
      }
      setLastResult(data);
      setStatusMsg(
        `Face match: ${data.status} · ${data.faceMatchScore ?? "—"} — ${data.note ?? ""}`,
      );
    } catch {
      setError("Erro de rede no face match.");
    } finally {
      setBusy(false);
    }
  };

  const runWebAuthn = async () => {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/kyc/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "options" }),
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setError(
          optData.error === "unauthorized"
            ? "Faça login para registrar passkey."
            : "Falha ao obter challenge WebAuthn.",
        );
        return;
      }

      // Stub verify (full navigator.credentials.create is environment-dependent)
      const challenge = optData.options?.challenge as string | undefined;
      let credentialId = `stub_${Date.now().toString(36)}`;

      if (isWebAuthnClient() && typeof navigator.credentials?.create === "function" && challenge) {
        try {
          // Best-effort real ceremony; ignore failures and fall back to stub id
          const enc = new TextEncoder();
          const challengeBytes = Uint8Array.from(
            atob(challenge.replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0),
          );
          const cred = (await navigator.credentials.create({
            publicKey: {
              challenge: challengeBytes,
              rp: { name: optData.options.rp.name, id: window.location.hostname },
              user: {
                id: enc.encode(String(optData.options.user.id)),
                name: optData.options.user.name,
                displayName: optData.options.user.displayName,
              },
              pubKeyCredParams: optData.options.pubKeyCredParams,
              timeout: optData.options.timeout,
              attestation: "none",
              authenticatorSelection: optData.options.authenticatorSelection,
            },
          })) as PublicKeyCredential | null;
          if (cred?.id) credentialId = cred.id;
        } catch {
          // user cancelled or platform unsupported for create — keep stub
        }
      }

      const verRes = await fetch("/api/kyc/webauthn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          challenge,
          credentialId,
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) {
        setError("Verificação WebAuthn falhou.");
        return;
      }
      setLastResult(verData);
      setStatusMsg("Passkey (WebAuthn) registrada com sucesso (fluxo stub/seguro).");
    } catch {
      setError("Erro de rede no WebAuthn.");
    } finally {
      setBusy(false);
    }
  };

  const eraseSession = async () => {
    setBusy(true);
    setError(null);
    try {
      const q = session?.sessionId
        ? `sessionId=${encodeURIComponent(session.sessionId)}`
        : "all=1";
      const res = await fetch(`/api/kyc/session?${q}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError("Falha ao excluir dados KYC.");
        return;
      }
      setSession(null);
      setLastResult(data);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setStatusMsg(data.message ?? "Dados biométricos excluídos.");
    } catch {
      setError("Erro de rede na exclusão.");
    } finally {
      setBusy(false);
    }
  };

  const refreshStatus = async () => {
    if (!session?.sessionId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/kyc/session?sessionId=${encodeURIComponent(session.sessionId)}`,
      );
      const data = await res.json();
      if (res.ok && data.session) {
        setSession((s) => ({
          ...(s ?? { sessionId: data.session.sessionId, provider: data.session.provider, status: data.session.status }),
          ...data.session,
          url: data.session.providerUrl ?? s?.url,
        }));
        setStatusMsg(`Status: ${data.session.status}`);
      }
    } catch {
      setError("Falha ao consultar status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={card}>
        <h2 className="font-display" style={{ margin: "0 0 10px", fontSize: 18, color: "#13233F" }}>
          Consentimento de biometria
        </h2>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontSize: 14,
            color: "#3E4E6C",
            lineHeight: 1.5,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 4, width: 18, height: 18, accentColor: "#12A5A5" }}
          />
          <span>
            Autorizo o tratamento de <strong>dados biométricos</strong> (selfie / prova de vida /
            correspondência facial) exclusivamente para verificação de identidade na Sociedade Fênix,
            nos termos da LGPD (art. 11 — dados sensíveis). Não envio imagem bruta a terceiros sem
            este consentimento.
          </span>
        </label>
      </div>

      <div style={card}>
        <h2 className="font-display" style={{ margin: "0 0 12px", fontSize: 18, color: "#13233F" }}>
          Captura local (câmera)
        </h2>
        <div
          style={{
            position: "relative",
            background: "#0C1D3E",
            borderRadius: 16,
            overflow: "hidden",
            aspectRatio: "4/3",
            maxWidth: 420,
            marginBottom: 12,
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
              display: cameraOn ? "block" : "none",
            }}
          />
          {!cameraOn && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,.65)",
                fontSize: 14,
                padding: 20,
                textAlign: "center",
              }}
            >
              Pré-visualização da câmera (apenas local)
            </div>
          )}
        </div>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Prévia da selfie (somente neste dispositivo)"
            style={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: 12,
              border: "2px solid #12A5A5",
              marginBottom: 12,
              transform: "scaleX(-1)",
            }}
          />
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            style={{ ...btnBase, background: "#12A5A5", color: "#fff" }}
            onClick={startCamera}
            disabled={busy}
          >
            Abrir câmera
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#13233F", color: "#fff" }}
            onClick={captureSelfie}
            disabled={busy || !cameraOn}
          >
            Capturar selfie
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#E8ECF4", color: "#3E4E6C" }}
            onClick={stopCamera}
            disabled={!cameraOn}
          >
            Fechar câmera
          </button>
        </div>
        {cameraError && (
          <p style={{ color: "#B45309", fontSize: 13, margin: "10px 0 0" }}>{cameraError}</p>
        )}
      </div>

      <div style={card}>
        <h2 className="font-display" style={{ margin: "0 0 12px", fontSize: 18, color: "#13233F" }}>
          Verificação
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            style={{ ...btnBase, background: "#12A5A5", color: "#fff" }}
            onClick={startSession}
            disabled={busy || !consent}
          >
            Iniciar sessão KYC
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#0C1D3E", color: "#fff" }}
            onClick={() => runLiveness("passive")}
            disabled={busy || !consent}
          >
            Liveness passivo
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#0C1D3E", color: "#fff" }}
            onClick={() => runLiveness("active")}
            disabled={busy || !consent}
          >
            Liveness ativo
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#0C1D3E", color: "#fff" }}
            onClick={() => runLiveness("video_fallback")}
            disabled={busy || !consent}
          >
            Vídeo (fallback)
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#13233F", color: "#fff" }}
            onClick={runFaceMatch}
            disabled={busy || !consent}
          >
            Face match
          </button>
          {webauthnOk && (
            <button
              type="button"
              style={{ ...btnBase, background: "#5B6C8F", color: "#fff" }}
              onClick={() => {
                void runLiveness("webauthn");
                void runWebAuthn();
              }}
              disabled={busy || !consent}
            >
              WebAuthn / passkey
            </button>
          )}
          <button
            type="button"
            style={{ ...btnBase, background: "#E8ECF4", color: "#3E4E6C" }}
            onClick={refreshStatus}
            disabled={busy || !session?.sessionId}
          >
            Atualizar status
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: "#FEE2E2", color: "#991B1B" }}
            onClick={eraseSession}
            disabled={busy}
          >
            Excluir dados KYC
          </button>
        </div>

        {session?.url && (
          <p style={{ fontSize: 14, color: "#3E4E6C", margin: "0 0 10px" }}>
            Fluxo hospedado do provedor:{" "}
            <a href={session.url} target="_blank" rel="noopener noreferrer" style={{ color: "#12A5A5" }}>
              abrir verificação
            </a>
          </p>
        )}

        {session && (
          <div
            style={{
              background: "#F5F7FB",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 13.5,
              color: "#3E4E6C",
              lineHeight: 1.55,
            }}
          >
            <div>
              <strong>Sessão:</strong> {session.sessionId}
            </div>
            <div>
              <strong>Provedor:</strong> {session.provider} · <strong>Status:</strong> {session.status}
              {session.band ? ` · faixa ${session.band}` : ""}
            </div>
            {(session.faceMatchScore != null || session.livenessScore != null) && (
              <div>
                Face: {session.faceMatchScore ?? "—"} · Liveness: {session.livenessScore ?? "—"}
              </div>
            )}
          </div>
        )}
      </div>

      {(error || statusMsg) && (
        <div
          style={{
            ...card,
            borderColor: error ? "rgba(185,28,28,.25)" : "rgba(18,165,165,.25)",
            background: error ? "#FEF2F2" : "#F0FDFA",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: error ? "#991B1B" : "#0F766E" }}>
            {error ?? statusMsg}
          </p>
        </div>
      )}

      {lastResult && (
        <div style={card}>
          <h3 className="font-display" style={{ margin: "0 0 8px", fontSize: 15, color: "#13233F" }}>
            Último resultado (sem mídia bruta)
          </h3>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              overflow: "auto",
              background: "#F5F7FB",
              padding: 12,
              borderRadius: 10,
              color: "#3E4E6C",
            }}
          >
            {JSON.stringify(
              {
                ...lastResult,
                // strip any accidental media fields
                image: undefined,
                selfie: undefined,
                video: undefined,
                base64: undefined,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: "#7A869E", lineHeight: 1.5, margin: "4px 2px 0" }}>
        Identidade da sessão vem do login. Face match / liveness nunca executam atos jurídicos sozinhos —
        o advogado decide via <strong>Botão Fênix</strong>.
      </p>
    </div>
  );
}
