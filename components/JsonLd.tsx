import { faqs } from "@/lib/data";

export const SITE_URL = "https://fenix.angra.io";

/** Renders a JSON-LD block. Safe: data is our own structured object, not user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const organizationSchema: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sociedade Fênix Tecnologia",
  alternateName: "Sociedade Fênix",
  url: SITE_URL,
  logo: `${SITE_URL}/fenix-mark.png`,
  image: `${SITE_URL}/fenix-logo.png`,
  slogan: "Organize. Respire. Recomece.",
  description:
    "Central pessoal de recuperação financeira, jurídica e administrativa. Organiza dívidas, cobranças, processos, bloqueios e pendências com o governo em linguagem simples; um advogado parceiro revisa tudo que exige responsabilidade jurídica.",
  areaServed: { "@type": "Country", name: "Brasil" },
  knowsLanguage: "pt-BR",
};

export const websiteSchema: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sociedade Fênix",
  url: SITE_URL,
  inLanguage: "pt-BR",
  publisher: { "@type": "Organization", name: "Sociedade Fênix Tecnologia" },
};

export const faqSchema: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};
