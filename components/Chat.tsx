"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { claraScript, claraUrgenteFirst } from "@/lib/data";

type Msg = { who: "clara" | "user"; text: string };

const WRAP: React.CSSProperties = { maxWidth: 780, margin: "0 auto" };

export default function Chat() {
  const router = useRouter();
  const params = useSearchParams();
  const urgente = params.get("urgente") === "1";

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(true);
  const [step, setStep] = useState(0);
  const [replies, setReplies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [chatFinal, setChatFinal] = useState(false);
  const [busy, setBusy] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chatEl = useRef<HTMLDivElement | null>(null);

  // startChat — mirrors the prototype's 1000ms first-message delay
  useEffect(() => {
    setMsgs([]);
    setTyping(true);
    setStep(0);
    setReplies([]);
    setChatFinal(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const first = claraScript[0];
      setTyping(false);
      if (urgente) {
        setMsgs([{ who: "clara", text: claraUrgenteFirst }]);
        setReplies([]);
      } else {
        setMsgs(first.asks.map((t) => ({ who: "clara" as const, text: t })));
        setReplies(first.replies);
      }
    }, 1000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urgente]);

  // auto-scroll on every update
  useEffect(() => {
    if (chatEl.current) chatEl.current.scrollTop = chatEl.current.scrollHeight;
  });

  /** Scripted Clara reply (the guided 5-question triage) — used by quick replies and as AI fallback. */
  const advanceScript = useCallback((fromStep: number) => {
    const next = Math.min(fromStep + 1, claraScript.length - 1);
    const done = fromStep >= claraScript.length - 2;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const stepDef = claraScript[next];
      setTyping(false);
      setStep(next);
      setMsgs((prev) => [...prev, ...stepDef.asks.map((t) => ({ who: "clara" as const, text: t }))]);
      setReplies(stepDef.replies);
      setChatFinal(done);
    }, 1200);
  }, []);

  const scriptedAnswer = useCallback(
    (text: string) => {
      setMsgs((prev) => [...prev, { who: "user", text }]);
      setReplies([]);
      setTyping(true);
      setDraft("");
      advanceScript(step);
    },
    [advanceScript, step]
  );

  /** Free-text goes to the real Clara (Grok). Falls back to the scripted flow on any failure. */
  const aiAnswer = useCallback(
    async (text: string) => {
      const history = [...msgs, { who: "user" as const, text }];
      setMsgs((prev) => [...prev, { who: "user", text }]);
      setReplies([]);
      setTyping(true);
      setDraft("");
      setBusy(true);
      const fallbackStep = step;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({
              role: m.who === "user" ? "user" : "assistant",
              content: m.text,
            })),
          }),
        });
        if (!res.ok || !res.body) throw new Error("clara-unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let created = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          if (!acc.trim()) continue;
          if (!created) {
            created = true;
            setTyping(false);
            setMsgs((prev) => [...prev, { who: "clara", text: acc }]);
          } else {
            setMsgs((prev) => {
              const copy = prev.slice();
              copy[copy.length - 1] = { who: "clara", text: acc };
              return copy;
            });
          }
        }
        if (!created) throw new Error("empty");
      } catch {
        // graceful fallback — continue the guided triage
        setTyping(true);
        advanceScript(fallbackStep);
      } finally {
        setBusy(false);
      }
    },
    [advanceScript, msgs, step]
  );

  const send = () => {
    const v = draft.trim();
    if (v && !busy) aiAnswer(v);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: "#F5F7FB" }}>
      {/* header */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(19,35,63,.07)" }}>
        <div style={{ ...WRAP, padding: "14px 22px", display: "flex", alignItems: "center", gap: 13 }}>
          <button
            onClick={() => router.push("/")}
            aria-label="Voltar"
            className="h-icon-round"
            style={{
              cursor: "pointer",
              width: 38,
              height: 38,
              flex: "none",
              background: "#F0F4F9",
              border: "none",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#13233F",
            }}
          >
            <Icon name="arrowLeft" size={17} strokeWidth={2.75} />
          </button>
          <div
            className="font-display"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "var(--grad-teal)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            C
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Clara</div>
            <div style={{ fontSize: 11.5, color: "#54627F" }}>
              assistente digital · não sou humana · decisões jurídicas passam por um advogado
            </div>
          </div>
          {urgente && (
            <span
              style={{
                background: "#FDEDE7",
                color: "#C2451F",
                fontSize: 11.5,
                fontWeight: 800,
                borderRadius: 999,
                padding: "6px 13px",
                whiteSpace: "nowrap",
              }}
            >
              Fila prioritária
            </span>
          )}
        </div>
      </div>

      {/* messages */}
      <div ref={chatEl} style={{ flex: 1, overflowY: "auto", padding: "26px 22px" }}>
        <div style={{ ...WRAP, display: "flex", flexDirection: "column", gap: 11 }}>
          {msgs.map((m, i) => {
            const isUser = m.who === "user";
            return (
              <div
                key={i}
                style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", animation: "fxUp .25s ease both" }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    background: isUser ? "linear-gradient(135deg, #14336B, #102A54)" : "#fff",
                    color: isUser ? "#fff" : "#13233F",
                    borderRadius: isUser ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
                    padding: "13px 17px",
                    fontSize: 15,
                    lineHeight: 1.55,
                    whiteSpace: "pre-line",
                    boxShadow: "0 2px 10px rgba(16,42,84,.06)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}

          {typing && (
            <div style={{ display: "flex" }}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "18px 18px 18px 5px",
                  padding: "15px 18px",
                  display: "flex",
                  gap: 5,
                  boxShadow: "0 2px 10px rgba(16,42,84,.06)",
                }}
              >
                {[0, 0.15, 0.3].map((d) => (
                  <span
                    key={d}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: "#12A5A5", animation: `fxDot 1.1s ${d}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {chatFinal && (
            <div style={{ display: "flex", justifyContent: "center", padding: "14px 0" }}>
              <Link
                href="/painel"
                className="h-btn-lift1"
                style={{
                  fontSize: 15.5,
                  fontWeight: 800,
                  borderRadius: 999,
                  padding: "15px 30px",
                  color: "#fff",
                  background: "var(--grad-orange)",
                  boxShadow: "0 12px 30px rgba(238,110,69,.4)",
                  animation: "fxUp .4s ease both",
                  textDecoration: "none",
                }}
              >
                Ver meu Mapa de Recomeço →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div style={{ background: "#fff", borderTop: "1px solid rgba(19,35,63,.07)", padding: "14px 22px 18px" }}>
        <div style={WRAP}>
          {replies.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 13 }}>
              {replies.map((label) => (
                <button
                  key={label}
                  onClick={() => scriptedAnswer(label)}
                  className="h-reply"
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "#fff",
                    border: "1.5px solid rgba(18,165,165,.45)",
                    borderRadius: 999,
                    padding: "9px 18px",
                    color: "#0C6E6E",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <button aria-label="Enviar áudio" className="h-icon-round" style={roundBtn}>
              <Icon name="mic" size={18} />
            </button>
            <button aria-label="Anexar documento" className="h-icon-round" style={roundBtn}>
              <Icon name="paperclip" size={18} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Escreva com as suas palavras…"
              style={{
                flex: 1,
                font: "inherit",
                fontSize: 15,
                minHeight: 44,
                padding: "0 18px",
                border: "1.5px solid rgba(19,35,63,.12)",
                borderRadius: 999,
                background: "#F5F7FB",
                color: "#13233F",
              }}
            />
            <button
              onClick={send}
              aria-label="Enviar"
              className="h-send"
              style={{
                cursor: "pointer",
                width: 44,
                height: 44,
                flex: "none",
                border: "none",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                background: "var(--grad-teal)",
                boxShadow: "0 6px 16px rgba(18,165,165,.35)",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const roundBtn: React.CSSProperties = {
  cursor: "pointer",
  width: 44,
  height: 44,
  flex: "none",
  background: "#F0F4F9",
  border: "none",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#13233F",
};
