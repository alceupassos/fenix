import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import DevScreenSwitcher from "@/components/DevScreenSwitcher";

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

export const metadata: Metadata = {
  title: "Sociedade Fênix — Organize. Respire. Recomece.",
  description:
    "Dívidas, cobranças, processos, bloqueios, pensão, herança ou pendências com o governo. Conte o que está acontecendo — a Fênix organiza sua situação, mostra os caminhos e age com você. Um advogado revisa tudo que exige responsabilidade jurídica.",
  icons: { icon: "/fenix-mark.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${bricolage.variable}`}>
      <body>
        {children}
        <DevScreenSwitcher />
      </body>
    </html>
  );
}
