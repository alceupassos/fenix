import { Suspense } from "react";
import Chat from "@/components/Chat";

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando…</div>}>
      <Chat />
    </Suspense>
  );
}
