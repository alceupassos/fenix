import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Painel from "@/components/Painel";
import { getDashboard } from "@/lib/repo";

export default async function PainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/painel");
  const data = await getDashboard(session.user.email);
  return (
    <Painel
      nome={session.user.name ?? "Marina"}
      dividas={data.dividas}
      prazos={data.prazos}
      docs={data.docs}
      reclamacoes={data.reclamacoes}
    />
  );
}
