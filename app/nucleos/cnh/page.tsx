import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CnhNucleo from "@/components/CnhNucleo";

export default async function CnhNucleoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/nucleos/cnh");
  return <CnhNucleo />;
}
