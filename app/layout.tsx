import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import DevScreenSwitcher from "@/components/DevScreenSwitcher";
import { JsonLd, organizationSchema, websiteSchema, SITE_URL } from "@/components/JsonLd";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const DESC =
  "Dívidas, cobranças, processos, bloqueios, pensão, herança ou pendências com o governo. Conte o que está acontecendo — a Fênix organiza sua situação, mostra os caminhos e age com você. Um advogado revisa tudo que exige responsabilidade jurídica.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sociedade Fênix — Organize. Respire. Recomece.",
    template: "%s · Sociedade Fênix",
  },
  description: DESC,
  applicationName: "Sociedade Fênix",
  keywords: [
    "recuperação financeira",
    "renegociar dívidas",
    "superendividamento",
    "nome negativado",
    "defesa de cobrança",
    "desbloqueio de conta",
    "INSS benefício negado",
    "dívida ativa",
    "MEI regularização",
    "direito do consumidor",
  ],
  authors: [{ name: "Sociedade Fênix Tecnologia" }],
  alternates: { canonical: "/" },
  icons: { icon: "/fenix-mark.png", apple: "/fenix-mark.png" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Sociedade Fênix",
    title: "Sociedade Fênix — Organize. Respire. Recomece.",
    description: DESC,
    images: [{ url: "/fenix-logo.png", width: 1200, height: 1200, alt: "Sociedade Fênix" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sociedade Fênix — Organize. Respire. Recomece.",
    description: DESC,
    images: ["/fenix-logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${bricolage.variable}`}>
      <body>
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        {children}
        <DevScreenSwitcher />
      </body>
    </html>
  );
}
