import { NextResponse } from "next/server";
import { guardCompetenciaPreciosSyncEsEditor } from "@/lib/apiRouteAuth";
import { getCompetenciaSyncProgressFromDb } from "@/lib/competenciaPreciosProgressDb";

export async function GET() {
  const denied = await guardCompetenciaPreciosSyncEsEditor();
  if (denied) return denied;
  const state = await getCompetenciaSyncProgressFromDb();
  return NextResponse.json({ ok: true, ...state });
}
