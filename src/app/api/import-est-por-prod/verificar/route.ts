import { NextResponse } from "next/server";
import { guardEstPorProdImportarEsEditor } from "@/lib/apiRouteAuth";
import { verificarEstPorProdPeriodoSchema } from "@/lib/validations/estPorProd";
import { verificarEstPorProdPeriodo } from "@/services/estPorProd.service";

/**
 * POST: Verifica si ya hay filas en `est_por_prod` para mes/año/sucursal.
 * Body: `verificarEstPorProdPeriodoSchema`.
 */
export async function POST(request: Request) {
  const denied = await guardEstPorProdImportarEsEditor();
  if (denied) return denied;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido." }, { status: 400 });
  }

  const parsed = verificarEstPorProdPeriodoSchema.safeParse(rawBody);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos inválidos.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  try {
    const res = await verificarEstPorProdPeriodo(
      parsed.data.sucursalId,
      parsed.data.mes,
      parsed.data.anio
    );
    if (!res.success) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: res.data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo verificar el periodo.";
    console.error("[api/import-est-por-prod/verificar]", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
