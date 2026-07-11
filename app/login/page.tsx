import { Suspense } from "react";
import Login from "@/components/Login";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando…</div>}>
      <Login />
    </Suspense>
  );
}
