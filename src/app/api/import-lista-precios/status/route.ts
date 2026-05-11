import { NextResponse } from "next/server";
import { guardListaPreciosImportarEsEditor } from "@/lib/apiRouteAuth";
import { getImportProgressFromDb } from "@/lib/importProgressDb";

/**
 * GET: Estado actual de la importación de lista de precios (para polling desde el cliente/sidebar).
 */
export async function GET() {
  const denied = await guardListaPreciosImportarEsEditor();
  if (denied) return denied;

  const progress = await getImportProgressFromDb();
  return NextResponse.json(progress);
}
