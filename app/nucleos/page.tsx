import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NucleosHub from "@/components/NucleosHub";

export default async function NucleosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/nucleos");
  return <NucleosHub />;
}
