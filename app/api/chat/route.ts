import { streamText, type CoreMessage } from "ai";
import { getClaraModel, CLARA_SYSTEM } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  let messages: CoreMessage[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return new Response("bad-request", { status: 400 });
  }

  const { model, hasKey } = getClaraModel();
  // No key configured → 503 so the client falls back to the scripted flow.
  if (!hasKey) return new Response("no-provider-key", { status: 503 });

  try {
    const result = streamText({
      model,
      system: CLARA_SYSTEM,
      messages,
      temperature: 0.6,
      maxTokens: 700,
    });
    return result.toTextStreamResponse();
  } catch {
    return new Response("upstream-error", { status: 502 });
  }
}
