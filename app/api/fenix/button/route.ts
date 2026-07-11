import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { applyFenixButton, listFenixDecisions, type FenixAction } from "@/lib/fenix-button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set<FenixAction>([
  "aprovar",
  "aprovar_com_alteracoes",
  "solicitar_documentos",
  "encaminhar_humano",
  "rejeitar",
  "marcar_urgente",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "advogado") {
    return NextResponse.json({ error: "forbidden — apenas advogado" }, { status: 403 });
  }

  let body: {
    caseId?: string;
    caseTitle?: string;
    action?: string;
    notes?: string;
    minutaVersion?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const action = body.action as FenixAction;
  if (!body.caseId || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "invalid action or caseId" }, { status: 400 });
  }

  const decision = applyFenixButton({
    caseId: body.caseId,
    caseTitle: body.caseTitle ?? body.caseId,
    action,
    actorName: session.user.name ?? "Advogado",
    actorOab: session.user.oab,
    notes: body.notes,
    minutaVersion: body.minutaVersion,
  });

  return NextResponse.json(decision);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "advogado") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const caseId = new URL(req.url).searchParams.get("caseId") ?? undefined;
  return NextResponse.json({ decisions: listFenixDecisions(caseId) });
}
