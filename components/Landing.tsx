import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import { Brand } from "@/components/Brand";
import PlanoCheckoutButton from "@/components/PlanoCheckoutButton";
import { JsonLd, faqSchema } from "@/components/JsonLd";
import {
  situacoes,
  passos,
  agentes,
  segCards,
  planos,
  faqs,
} from "@/lib/data";

const WRAP: React.CSSProperties = { maxWidth: 1180, margin: "0 auto" };

function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(245,247,251,.85)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(19,35,63,.07)",
      }}
    >
      <div
        style={{
          ...WRAP,
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <Brand />
        <nav
          style={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            marginLeft: "auto",
            alignItems: "center",
          }}
        >
          {[
            ["#situacoes", "Situações"],
            ["#como-funciona", "Como funciona"],
            ["#seguranca", "Segurança"],
            ["#planos", "Planos"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="h-navlink"
              style={{
                color: "#3E4E6C",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 999,
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/login"
            className="h-btn-outline-dark"
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              background: "transparent",
              border: "1.5px solid rgba(19,35,63,.15)",
              color: "#13233F",
              borderRadius: 999,
              padding: "10px 20px",
              textDecoration: "none",
            }}
          >
            Entrar
          </Link>
          <Link
            href="/chat"
            className="h-btn-orange"
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              border: "none",
              borderRadius: 999,
              padding: "11px 22px",
              color: "#fff",
              background: "var(--grad-orange)",
              boxShadow: "0 8px 20px rgba(238,110,69,.35)",
              textDecoration: "none",
            }}
          >
            Começar meu recomeço
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      style={{
        background:
          "radial-gradient(1200px 600px at 75% -10%, rgba(18,165,165,.35), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(238,110,69,.22), transparent 55%), linear-gradient(160deg, #0C1D3E 0%, #102A54 55%, #0E2348 100%)",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          ...WRAP,
          padding: "84px 28px 96px",
          display: "flex",
          gap: 56,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 520px", minWidth: 300, animation: "fxUp .6s ease both" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(78,205,196,.14)",
              border: "1px solid rgba(78,205,196,.35)",
              color: "#7FE3DC",
              borderRadius: 999,
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              marginBottom: 26,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#4ECDC4",
                animation: "fxGlow 2s infinite",
              }}
            />
            Organize · Respire · Recomece
          </div>
          <h1
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(38px, 5.2vw, 60px)",
              lineHeight: 1.06,
              letterSpacing: "-.03em",
              margin: "0 0 22px",
              textWrap: "balance",
            }}
          >
            Quando tudo parece fora de controle, comece por{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #4ECDC4, #F5A34F)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              um problema de cada vez.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17.5,
              lineHeight: 1.65,
              color: "rgba(255,255,255,.78)",
              maxWidth: "56ch",
              margin: "0 0 30px",
            }}
          >
            Dívidas, cobranças, processos, bloqueios, pensão, herança ou pendências com o governo.
            Conte o que está acontecendo, com as suas palavras — a Fênix organiza sua situação,
            mostra os caminhos e age com você. Um advogado revisa tudo que exige responsabilidade
            jurídica.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 34 }}>
            <Link
              href="/chat"
              className="h-btn-orange-lg"
              style={{
                fontSize: 16,
                fontWeight: 800,
                borderRadius: 999,
                padding: "17px 32px",
                color: "#fff",
                background: "var(--grad-orange)",
                boxShadow: "0 14px 34px rgba(238,110,69,.45)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              Começar meu recomeço
              <Icon name="arrowRight" size={18} strokeWidth={2.75} />
            </Link>
            <Link
              href="/urgente"
              className="h-btn-ghost-light"
              style={{
                fontSize: 15,
                fontWeight: 700,
                background: "rgba(255,255,255,.06)",
                border: "1.5px solid rgba(255,255,255,.28)",
                color: "#fff",
                borderRadius: 999,
                padding: "16px 26px",
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                textDecoration: "none",
              }}
            >
              <Icon name="clock" size={16} stroke="#F5A34F" strokeWidth={2.75} />
              Tenho um prazo urgente
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,.6)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Icon name="shield" size={15} stroke="#4ECDC4" strokeWidth={2.75} />
              Advogado revisa cada medida
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Icon name="lock" size={15} stroke="#4ECDC4" strokeWidth={2.75} />
              Criptografia · LGPD
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ECDC4" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Pagamento seguro · Stripe
            </span>
          </div>
        </div>

        {/* Clara chat card */}
        <div
          style={{
            flex: "1 1 380px",
            minWidth: 300,
            display: "flex",
            justifyContent: "center",
            animation: "fxUp .7s .15s ease both",
          }}
        >
          <div style={{ width: "min(420px, 100%)", position: "relative" }}>
            <Image
              src="/fenix-mark.png"
              alt=""
              width={96}
              height={91}
              style={{
                position: "absolute",
                top: -46,
                right: -12,
                width: 96,
                height: "auto",
                filter: "drop-shadow(0 16px 30px rgba(0,0,0,.35))",
                animation: "fxFloat 5s ease-in-out infinite",
                zIndex: 2,
              }}
            />
            <div
              style={{
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.14)",
                backdropFilter: "blur(18px)",
                borderRadius: 26,
                padding: 24,
                boxShadow: "0 30px 70px rgba(4,12,30,.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
                <div
                  className="font-display"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--grad-teal)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 17,
                    color: "#fff",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Image
                    src="/brand/clara-mark.jpg"
                    alt=""
                    width={40}
                    height={40}
                    style={{ width: 40, height: 40, objectFit: "cover" }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>Clara</div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)" }}>
                    assistente digital da Fênix · online agora
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,.1)",
                  borderRadius: "18px 18px 18px 5px",
                  padding: "14px 17px",
                  fontSize: 15.5,
                  fontWeight: 600,
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                O que está tirando o seu sono?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "Estou cheio de dívidas",
                  "Meu salário está sendo descontado",
                  "Não sei por onde começar",
                ].map((t) => (
                  <Link
                    key={t}
                    href="/chat"
                    className="h-chip-clara"
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      textAlign: "left",
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.18)",
                      color: "rgba(255,255,255,.9)",
                      borderRadius: 14,
                      padding: "12px 16px",
                      textDecoration: "none",
                    }}
                  >
                    {t}
                  </Link>
                ))}
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11.5,
                  color: "rgba(255,255,255,.45)",
                }}
              >
                <Icon name="lock" size={13} strokeWidth={2.75} />
                Conversa protegida. Você também pode enviar áudio, fotos e documentos.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContextStrip() {
  return (
    <section style={{ background: "#fff", borderBottom: "1px solid rgba(19,35,63,.06)" }}>
      <div
        style={{
          ...WRAP,
          padding: "30px 28px",
          display: "flex",
          gap: 36,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 14.5, color: "#3E4E6C", maxWidth: "46ch" }}>
          <strong style={{ color: "#13233F" }}>83,5 milhões de brasileiros</strong> estão com o
          nome negativado. Você não está sozinho — e existe um caminho.
        </div>
        <div style={{ display: "flex", gap: 34, flexWrap: "wrap" }}>
          {[
            ["1 lugar", "para organizar tudo"],
            ["100%", "das medidas jurídicas revisadas"],
            ["90 dias", "nossa meta para você retomar o controle"],
          ].map(([n, l]) => (
            <div key={n}>
              <div className="font-display" style={{ fontWeight: 800, fontSize: 26, color: "#12A5A5" }}>
                {n}
              </div>
              <div style={{ fontSize: 12.5, color: "#54627F", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kicker({ children, color = "#EE6E45" }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function Situacoes() {
  return (
    <section id="situacoes" style={{ ...WRAP, padding: "88px 28px 40px" }}>
      <Kicker>Sem juridiquês</Kicker>
      <h2
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 40px)",
          letterSpacing: "-.02em",
          lineHeight: 1.1,
          margin: "0 0 14px",
          maxWidth: "24ch",
        }}
      >
        O que está acontecendo com você?
      </h2>
      <p style={{ fontSize: 16, color: "#556482", maxWidth: "64ch", margin: "0 0 36px", lineHeight: 1.6 }}>
        Escolha o que mais se parece com a sua situação — ou apenas conte com as suas palavras, por
        texto, áudio, foto ou documento.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))",
          gap: 16,
        }}
      >
        {situacoes.map((s) => (
          <Link
            key={s.titulo}
            href="/chat"
            className="h-card-situacao"
            style={{
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#fff",
              border: "1px solid rgba(19,35,63,.08)",
              borderRadius: 20,
              padding: 22,
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: s.iconBg,
                color: s.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={s.icon} size={20} />
            </span>
            <span style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.3, color: "#13233F" }}>
              {s.titulo}
            </span>
            <span style={{ fontSize: 13, color: "#54627F", lineHeight: 1.5 }}>{s.desc}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section id="como-funciona" style={{ ...WRAP, padding: "72px 28px" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(19,35,63,.07)",
          borderRadius: 32,
          padding: "clamp(28px, 5vw, 56px)",
          boxShadow: "0 24px 60px rgba(16,42,84,.06)",
        }}
      >
        <Kicker>Como funciona</Kicker>
        <h2
          className="font-display"
          style={{
            fontWeight: 800,
            fontSize: "clamp(28px, 3.6vw, 40px)",
            letterSpacing: "-.02em",
            margin: "0 0 40px",
          }}
        >
          Você conta. Nós organizamos.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
            gap: 26,
          }}
        >
          {passos.map((p) => (
            <div key={p.n} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                className="font-display"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: p.bg,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 17,
                }}
              >
                {p.n}
              </div>
              <strong style={{ fontSize: 15.5, lineHeight: 1.3 }}>{p.titulo}</strong>
              <p style={{ fontSize: 13.5, margin: 0, color: "#54627F", lineHeight: 1.55 }}>{p.desc}</p>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 44,
            paddingTop: 30,
            borderTop: "1px solid rgba(19,35,63,.07)",
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "#54627F",
              marginRight: 8,
            }}
          >
            Quem cuida de você
          </span>
          {agentes.map((ag) => (
            <span
              key={ag.nome}
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 7,
                background: "#F0F4F9",
                borderRadius: 999,
                padding: "7px 15px",
                fontSize: 12.5,
              }}
            >
              <strong style={{ color: "#0C6E6E" }}>{ag.nome}</strong>
              <span style={{ color: "#54627F" }}>{ag.papel}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Seguranca() {
  return (
    <section
      id="seguranca"
      style={{ background: "linear-gradient(160deg, #0C1D3E, #102A54)", color: "#fff", marginTop: 24 }}
    >
      <div style={{ ...WRAP, padding: "88px 28px", display: "flex", gap: 56, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 400px", minWidth: 300 }}>
          <Kicker color="#4ECDC4">Segurança e confiança</Kicker>
          <h2
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: "clamp(28px, 3.6vw, 40px)",
              letterSpacing: "-.02em",
              margin: "0 0 18px",
              maxWidth: "18ch",
            }}
          >
            A Fênix fica do seu lado. Sempre.
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "rgba(255,255,255,.72)", maxWidth: "54ch" }}>
            Não vendemos seus dados. Não recebemos comissão de credores. Não criamos urgência
            artificial. E quando existir um canal público gratuito para a sua etapa, nós avisamos:
          </p>
          <div
            style={{
              marginTop: 24,
              background: "rgba(78,205,196,.1)",
              border: "1px solid rgba(78,205,196,.3)",
              borderRadius: 20,
              padding: "22px 26px",
              fontSize: 16.5,
              lineHeight: 1.55,
              fontWeight: 600,
              color: "#C9F2EE",
            }}
          >
            &ldquo;Você não precisa contratar um serviço pago para esta etapa. Podemos orientá-lo a
            usar gratuitamente o canal público.&rdquo;
          </div>
        </div>
        <div
          style={{
            flex: "1 1 440px",
            minWidth: 300,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            alignContent: "start",
          }}
        >
          {segCards.map((sc) => (
            <div
              key={sc.titulo}
              className="h-card-seg"
              style={{
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 20,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 11,
              }}
            >
              <Icon name={sc.icon} size={22} stroke="#4ECDC4" />
              <strong style={{ fontSize: 15 }}>{sc.titulo}</strong>
              <p style={{ fontSize: 13, margin: 0, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>
                {sc.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Planos() {
  return (
    <section id="planos" style={{ ...WRAP, padding: "88px 28px 40px" }}>
      <Kicker>Planos</Kicker>
      <h2
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 40px)",
          letterSpacing: "-.02em",
          margin: "0 0 36px",
        }}
      >
        Comece de graça. Avance no seu ritmo.
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        {planos.map((pl) => (
          <div
            key={pl.kicker}
            style={{
              background: "#fff",
              border: pl.border,
              borderRadius: 26,
              padding: 30,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: pl.shadow,
              position: "relative",
            }}
          >
            {pl.destaque && (
              <span
                style={{
                  position: "absolute",
                  top: -13,
                  left: 28,
                  background: "var(--grad-orange)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  borderRadius: 999,
                  padding: "5px 14px",
                }}
              >
                Mais escolhido
              </span>
            )}
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#12A5A5" }}>
              {pl.kicker}
            </div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 36, letterSpacing: "-.02em" }}>
              {pl.preco}
              <span style={{ fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 600, color: "#54627F" }}>
                {pl.periodo}
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#556482", lineHeight: 1.6, margin: 0, flex: 1 }}>{pl.desc}</p>
            {pl.checkout ? (
              <PlanoCheckoutButton
                plan={pl.checkout}
                className="h-btn-lift1"
                style={{
                  font: "inherit",
                  cursor: "pointer",
                  border: "none",
                  fontSize: 14.5,
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: 999,
                  padding: "14px 22px",
                  background: pl.btnBg,
                  color: pl.btnColor,
                  boxShadow: pl.btnShadow,
                }}
              >
                {pl.cta}
              </PlanoCheckoutButton>
            ) : (
              <Link
                href={pl.action === "painel" ? "/painel" : "/chat"}
                className="h-btn-lift1"
                style={{
                  fontSize: 14.5,
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: 999,
                  padding: "14px 22px",
                  background: pl.btnBg,
                  color: pl.btnColor,
                  boxShadow: pl.btnShadow,
                  textDecoration: "none",
                }}
              >
                {pl.cta}
              </Link>
            )}
            <div
              style={{
                fontSize: 11.5,
                textAlign: "center",
                color: "#657493",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name="lock" size={12} strokeWidth={2.75} />
              {pl.nota}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, marginTop: 24, color: "#657493", maxWidth: "86ch", lineHeight: 1.6 }}>
        Serviços privativos de advocacia — análise jurídica individualizada, petições, representação
        — são contratados diretamente com a advocacia parceira, mediante análise do caso, proposta de
        honorários e contrato próprio, conforme as regras da OAB.
      </p>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" style={{ ...WRAP, padding: "72px 28px 40px" }}>
      <Kicker>Perguntas frequentes</Kicker>
      <h2
        className="font-display"
        style={{
          fontWeight: 800,
          fontSize: "clamp(28px, 3.6vw, 40px)",
          letterSpacing: "-.02em",
          margin: "0 0 28px",
          maxWidth: "20ch",
        }}
      >
        Sem letras miúdas.
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 820 }}>
        {faqs.map((f) => (
          <details
            key={f.q}
            style={{
              background: "#fff",
              border: "1px solid rgba(19,35,63,.08)",
              borderRadius: 16,
              padding: "4px 20px",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                listStyle: "none",
                padding: "16px 0",
                fontWeight: 700,
                fontSize: 15.5,
                color: "#13233F",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ flex: 1 }}>{f.q}</span>
              <span style={{ color: "#12A5A5", fontSize: 20, lineHeight: 1, flex: "none" }} aria-hidden>
                +
              </span>
            </summary>
            <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.65, color: "#54627F", maxWidth: "68ch" }}>
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "88px 28px 100px", textAlign: "center" }}>
      <Image src="/fenix-mark.png" alt="" width={72} height={68} style={{ margin: "0 auto 24px", width: 72, height: "auto" }} />
      <p
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: "clamp(24px, 3.6vw, 36px)",
          lineHeight: 1.25,
          letterSpacing: "-.02em",
          margin: "0 0 14px",
          textWrap: "balance",
        }}
      >
        &ldquo;Eu estava perdido e foi ali que consegui começar a colocar minha vida em ordem.&rdquo;
      </p>
      <p style={{ fontSize: 14, color: "#54627F", margin: "0 0 28px" }}>
        É isso que queremos ouvir de cada pessoa que passa pela Fênix.
      </p>
      <Link
        href="/chat"
        className="h-btn-orange-cta"
        style={{
          display: "inline-block",
          fontSize: 16,
          fontWeight: 800,
          borderRadius: 999,
          padding: "17px 34px",
          color: "#fff",
          background: "var(--grad-orange)",
          boxShadow: "0 14px 34px rgba(238,110,69,.4)",
          textDecoration: "none",
        }}
      >
        Começar meu recomeço
      </Link>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#0A1730", color: "rgba(255,255,255,.65)" }}>
      <div style={{ ...WRAP, padding: "56px 28px 40px", display: "flex", gap: 48, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 340px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Image src="/fenix-mark.png" alt="" width={34} height={32} style={{ width: 34, height: "auto" }} />
            <span className="font-display" style={{ fontWeight: 800, fontSize: 17, color: "#fff" }}>
              Sociedade Fênix
            </span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, maxWidth: "62ch", color: "rgba(255,255,255,.5)", margin: 0 }}>
            A Sociedade Fênix Tecnologia organiza, prepara e acompanha providências administrativas.
            Serviços privativos de advocacia são prestados exclusivamente pela advocacia parceira,
            sociedade inscrita na OAB, com contrato e honorários próprios. Nossa tecnologia não
            substitui um advogado e não prometemos resultados.
          </p>
        </div>
        {[
          ["Caminhos", [["#situacoes", "Situações atendidas"], ["#como-funciona", "Como funciona"], ["#planos", "Planos"], ["/nucleos", "Núcleos de serviço"]]],
          ["Confiança", [["/privacidade", "Privacidade e LGPD"], ["#seguranca", "Segurança"], ["#seguranca", "Advocacia parceira"]]],
        ].map(([title, links]) => (
          <div
            key={title as string}
            style={{ flex: "1 1 150px", fontSize: 13.5, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <strong style={{ color: "#fff", fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase" }}>
              {title as string}
            </strong>
            {(links as [string, string][]).map(([href, label], i) => (
              <a key={i} href={href} style={{ color: "rgba(255,255,255,.65)", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1 }}>
        <Header />
        <Hero />
        <ContextStrip />
        <Situacoes />
        <ComoFunciona />
        <Seguranca />
        <Planos />
        <Faq />
        <CtaFinal />
        <Footer />
        <JsonLd data={faqSchema} />
      </div>
    </div>
  );
}
