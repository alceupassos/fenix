import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Advogado from "@/components/Advogado";
import { getCases } from "@/lib/repo";

export default async function AdvogadoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/advogado");
  if (session.user.role !== "advogado") redirect("/painel");
  const casos = await getCases();
  return (
    <Advogado
      nome={session.user.name ?? "Dr. Leandro Giannasi"}
      oab={session.user.oab ?? "OAB/SP 211.304"}
      casos={casos}
    />
  );
}
