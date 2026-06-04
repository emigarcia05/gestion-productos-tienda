/**
 * Costo lista para Cx/Px Tienda: `prod_precios_tienda.costo_compra_cod_ext` → `prod_precios_provee`.
 * `costo_compra` / `proveedor` en tienda siguen siendo espejo DUX (sync).
 */
import type { ServiceResult } from "@/types";
import { prisma } from "@/lib/prisma";

export function normalizarTextoProveedor(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function proveedorTextoCoincideConDux(
  proveedorDux: string | null | undefined,
  nombre: string | null | undefined,
  prefijo: string | null | undefined
): boolean {
  const dux = normalizarTextoProveedor(proveedorDux);
  if (!dux) return false;
  const nom = normalizarTextoProveedor(nombre);
  const pref = normalizarTextoProveedor(prefijo);
  return dux === nom || (pref.length > 0 && dux === pref);
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export type CostoCxPxResuelto = {
  costoCompra: number;
  proveedorLabel: string | null;
  costoCompraCodExt: string | null;
  /** true si el valor viene de FK persistida (no de fallback en lectura). */
  desdeFkPersistida: boolean;
};

/** Valida que `codExt` sea candidato de costo para el ítem tienda. */
export async function validarCodExtCostoLista(
  codTienda: string,
  codExt: string
): Promise<ServiceResult<void>> {
  const row = await prisma.listaPrecioProveedor.findFirst({
    where: {
      codExt,
      codTiendaVinculo: codTienda,
      habilitado: true,
    },
    select: { codExt: true },
  });
  if (!row) {
    return {
      success: false,
      error: "El producto no está vinculado y habilitado para este ítem de tienda.",
    };
  }
  return { success: true, data: undefined };
}

export async function establecerCodExtCostoLista(
  codTienda: string,
  codExt: string
): Promise<ServiceResult<void>> {
  const valid = await validarCodExtCostoLista(codTienda, codExt);
  if (!valid.success) return valid;

  try {
    await prisma.prodTienda.update({
      where: { codTienda },
      data: { costoCompraCodExt: codExt },
    });
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Si la FK apunta a `codExt`, la limpia (p. ej. al desvincular esa fila). */
export async function limpiarCodExtCostoListaSiCoincide(
  codTienda: string,
  codExt: string
): Promise<void> {
  await prisma.prodTienda.updateMany({
    where: { codTienda, costoCompraCodExt: codExt },
    data: { costoCompraCodExt: null },
  });
}

/**
 * Tras vincular: si aún no hay costo lista, asigna único candidato habilitado o el que coincide con proveedor DUX.
 */
export async function autoAsignarCodExtCostoListaTrasVincular(
  codTienda: string
): Promise<void> {
  const tienda = await prisma.prodTienda.findUnique({
    where: { codTienda },
    select: { costoCompraCodExt: true, proveedor: true },
  });
  if (!tienda || tienda.costoCompraCodExt) return;

  const candidatos = await prisma.listaPrecioProveedor.findMany({
    where: { codTiendaVinculo: codTienda, habilitado: true },
    select: {
      codExt: true,
      proveedor: { select: { nombre: true, prefijo: true } },
    },
  });
  if (candidatos.length === 0) return;

  if (candidatos.length === 1) {
    await prisma.prodTienda.update({
      where: { codTienda },
      data: { costoCompraCodExt: candidatos[0].codExt },
    });
    return;
  }

  const matchDux = candidatos.find((c) =>
    proveedorTextoCoincideConDux(
      tienda.proveedor,
      c.proveedor.nombre,
      c.proveedor.prefijo
    )
  );
  if (matchDux) {
    await prisma.prodTienda.update({
      where: { codTienda },
      data: { costoCompraCodExt: matchDux.codExt },
    });
  }
}

type FilaTiendaCostoInput = {
  codTienda: string;
  proveedor: string | null;
  costoCompra: unknown;
  costoCompraCodExt: string | null;
  costoListaProveedor: {
    pxCompraFinalSinIva: unknown;
    proveedor: { nombre: string; prefijo: string | null };
  } | null;
};

/**
 * Resuelve CX. COMPRA y proveedor para la grilla Cx/Px.
 * Prioridad: FK persistida → único candidato habilitado (solo lectura) → match DUX entre vínculos → espejo DUX.
 */
export async function resolverCostoCxPxParaFila(
  row: FilaTiendaCostoInput,
  candidatosCache?: Awaited<ReturnType<typeof listarCandidatosCostoPorCodTienda>>
): Promise<CostoCxPxResuelto> {
  const costoDux = toNum(row.costoCompra);
  const proveedorDux = row.proveedor?.trim() || null;

  if (row.costoListaProveedor && row.costoCompraCodExt) {
    const lp = row.costoListaProveedor;
    const px = toNum(lp.pxCompraFinalSinIva);
    const label =
      (lp.proveedor.prefijo ?? "").trim() ||
      lp.proveedor.nombre.trim() ||
      null;
    return {
      costoCompra: px > 0 ? px : costoDux,
      proveedorLabel: label ?? proveedorDux,
      costoCompraCodExt: row.costoCompraCodExt,
      desdeFkPersistida: true,
    };
  }

  const candidatos =
    candidatosCache ?? (await listarCandidatosCostoPorCodTienda(row.codTienda));

  if (candidatos.length === 1) {
    const c = candidatos[0];
    const px = toNum(c.pxCompraFinalSinIva);
    const label =
      (c.proveedor.prefijo ?? "").trim() || c.proveedor.nombre.trim() || null;
    return {
      costoCompra: px > 0 ? px : costoDux,
      proveedorLabel: label ?? proveedorDux,
      costoCompraCodExt: c.codExt,
      desdeFkPersistida: false,
    };
  }

  const matchDux = candidatos.find((c) =>
    proveedorTextoCoincideConDux(row.proveedor, c.proveedor.nombre, c.proveedor.prefijo)
  );
  if (matchDux) {
    const px = toNum(matchDux.pxCompraFinalSinIva);
    const label =
      (matchDux.proveedor.prefijo ?? "").trim() ||
      matchDux.proveedor.nombre.trim() ||
      null;
    return {
      costoCompra: px > 0 ? px : costoDux,
      proveedorLabel: label ?? proveedorDux,
      costoCompraCodExt: matchDux.codExt,
      desdeFkPersistida: false,
    };
  }

  return {
    costoCompra: costoDux,
    proveedorLabel: proveedorDux,
    costoCompraCodExt: null,
    desdeFkPersistida: false,
  };
}

export async function listarCandidatosCostoPorCodTienda(codTienda: string) {
  return prisma.listaPrecioProveedor.findMany({
    where: { codTiendaVinculo: codTienda, habilitado: true },
    select: {
      codExt: true,
      pxCompraFinalSinIva: true,
      proveedor: { select: { nombre: true, prefijo: true } },
    },
  });
}

export function etiquetaProveedorCosto(prefijo: string | null, nombre: string): string {
  const p = (prefijo ?? "").trim();
  if (p) return p;
  return nombre.trim();
}

export function costoDesdeCandidato(pxCompraFinalSinIva: unknown): number {
  return toNum(pxCompraFinalSinIva);
}

/** Promedio de `px_compra_final_sin_iva` entre vínculos habilitados (> 0). */
export function calcularCostoPromedioVinculos(
  candidatos: Array<{ pxCompraFinalSinIva: unknown }>
): number | null {
  const valores = candidatos
    .map((c) => toNum(c.pxCompraFinalSinIva))
    .filter((n) => n > 0);
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export async function limpiarCodExtCostoLista(codTienda: string): Promise<ServiceResult<void>> {
  try {
    await prisma.prodTienda.update({
      where: { codTienda },
      data: { costoCompraCodExt: null },
    });
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
