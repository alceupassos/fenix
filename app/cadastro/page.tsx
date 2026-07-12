import type { Metadata } from "next";
import Cadastro from "@/components/Cadastro";

export const metadata: Metadata = {
  title: "Criar conta — Sociedade Fênix",
  description:
    "Abra sua conta na Sociedade Fênix com consentimento LGPD. Organize dívidas, prazos e documentos no seu ritmo.",
};

export default function CadastroPage() {
  return <Cadastro />;
}
