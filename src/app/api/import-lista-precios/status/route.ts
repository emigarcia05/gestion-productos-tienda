import { NextResponse } from "next/server";
import { guardListaPreciosImportarEsEditor } from "@/lib/apiRouteAuth";
import { getImportProgressFromDb, importProgressIdleState } from "@/lib/importProgressDb";

/**
 * GET: Estado actual de la importación de lista de precios (para polling desde el cliente/sidebar).
 * Sin permiso de editor: responde estado inactivo (200) para no generar 403 en el polling de fondo.
 */
export async function GET() {
  const denied = await guardListaPreciosImportarEsEditor();
  if (denied) {
    return NextResponse.json(importProgressIdleState());
  }

  const progress = await getImportProgressFromDb();
  return NextResponse.json(progress);
}
