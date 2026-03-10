import { NextResponse } from "next/server";
import { getExportProgressFromDb } from "@/lib/exportProgressDb";

/**
 * GET: Estado actual de la exportación "Exportar Px. Dux" (para polling desde la sidebar).
 */
export async function GET() {
  const progress = await getExportProgressFromDb();
  return NextResponse.json(progress);
}
