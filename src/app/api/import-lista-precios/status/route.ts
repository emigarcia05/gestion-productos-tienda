import { NextResponse } from "next/server";
import { getImportProgress } from "@/lib/importProgressStore";

/**
 * GET: Estado actual de la importación de lista de precios (para polling desde el cliente/sidebar).
 */
export async function GET() {
  const progress = getImportProgress();
  return NextResponse.json(progress);
}
