import { NextResponse } from "next/server";
import { getImportProgressFromDb } from "@/lib/importProgressDb";

/**
 * GET: Estado actual de la importación de lista de precios (para polling desde el cliente/sidebar).
 */
export async function GET() {
  const progress = await getImportProgressFromDb();
  return NextResponse.json(progress);
}
