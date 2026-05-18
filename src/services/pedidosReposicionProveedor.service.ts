/**
 * Resolución de proveedor para pedido REPOSICIÓN por `cod_tienda` (vínculos en
 * `prod_precios_provee.cod_tienda`) y menor costo comparable según Posición IVA.
 */

import { IvaProveedor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ordenarMiembrosPedidoUrgentePorMenorCostoComparable,
  type MiembroPrecioComparablePedidoUrgente,
} from "@/lib/precioComparacionPedidoUrgenteReposicion";
import { sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido } from "@/services/finBalPosicionIvaSaldoAcumuladoPedido.service";
import {
  pickListaPrecioProveedorPorCodExtYTienda,
  type LpRowPick,
} from "@/services/pedidosEnvio.service";

export type LpRowReposicionResuelto = LpRowPick & {
  codExt: string;
  pxCompraFinalSinIva: number | null;
  ivaProveedor: IvaProveedor;
};

const selectListaPrecioReposicion = {
  codExt: true,
  idProveedor: true,
  codProdProveedor: true,
  descripcionProveedor: true,
  codTiendaVinculo: true,
  pxCompraFinalSinIva: true,
  proveedor: { select: { prefijo: true, nombre: true, iva: true } },
} as const;

type FilaLpReposicion = {
  codExt: string;
  idProveedor: string;
  codProdProveedor: string | null;
  descripcionProveedor: string;
  codTiendaVinculo: string | null;
  pxCompraFinalSinIva: unknown;
  proveedor: { prefijo: string | null; nombre: string | null; iva: IvaProveedor };
};

function filaLpToResuelto(f: FilaLpReposicion): LpRowReposicionResuelto {
  const px =
    f.pxCompraFinalSinIva != null && Number.isFinite(Number(f.pxCompraFinalSinIva))
      ? Number(f.pxCompraFinalSinIva)
      : null;
  return {
    codExt: f.codExt,
    idProveedor: f.idProveedor,
    codProdProveedor: f.codProdProveedor,
    descripcionProveedor: f.descripcionProveedor,
    codTiendaVinculo: f.codTiendaVinculo,
    proveedor: { prefijo: f.proveedor.prefijo, nombre: f.proveedor.nombre },
    pxCompraFinalSinIva: px,
    ivaProveedor: f.proveedor.iva,
  };
}

export function proveedorEtiquetaPedidoDesdeRow(p: {
  prefijo: string | null;
  nombre: string | null;
}): string {
  const pref = (p.prefijo ?? "").trim();
  const nom = (p.nombre ?? "").trim();
  return pref.length > 0 ? `[${pref}] ${nom}`.trim().toUpperCase() : nom.toUpperCase();
}

/** Agrupa filas habilitadas por `cod_tienda` de vínculo. */
export function mapaListaPrecioPorCodTiendaVinculo(
  filas: LpRowReposicionResuelto[]
): Map<string, LpRowReposicionResuelto[]> {
  const map = new Map<string, LpRowReposicionResuelto[]>();
  for (const f of filas) {
    const ct = (f.codTiendaVinculo ?? "").trim();
    if (!ct) continue;
    const arr = map.get(ct) ?? [];
    arr.push(f);
    map.set(ct, arr);
  }
  return map;
}

export async function cargarListaPrecioReposicionPorCodTiendas(
  codTiendas: string[]
): Promise<Map<string, LpRowReposicionResuelto[]>> {
  const keys = [...new Set(codTiendas.map((c) => c.trim()).filter(Boolean))];
  if (keys.length === 0) return new Map();

  const filas = await prisma.listaPrecioProveedor.findMany({
    where: { codTiendaVinculo: { in: keys }, habilitado: true },
    select: selectListaPrecioReposicion,
    orderBy: [{ codTiendaVinculo: "asc" }, { idProveedor: "asc" }],
  });

  return mapaListaPrecioPorCodTiendaVinculo(filas.map(filaLpToResuelto));
}

export async function cargarListaPrecioReposicionFallbackPorCodExt(
  codExts: string[]
): Promise<Map<string, LpRowReposicionResuelto[]>> {
  const keys = [...new Set(codExts.map((c) => c.trim()).filter(Boolean))];
  if (keys.length === 0) return new Map();

  const filas = await prisma.listaPrecioProveedor.findMany({
    where: { codExt: { in: keys }, habilitado: true },
    select: selectListaPrecioReposicion,
    orderBy: [{ codExt: "asc" }, { idProveedor: "asc" }],
  });

  const map = new Map<string, LpRowReposicionResuelto[]>();
  for (const f of filas.map(filaLpToResuelto)) {
    const k = f.codExt.trim();
    const arr = map.get(k) ?? [];
    arr.push(f);
    map.set(k, arr);
  }
  return map;
}

type TiendaPickReposicion = {
  codTienda: string;
  codExt: string | null;
  proveedor: string | null;
};

/**
 * Elige la fila de lista proveedor para un `cod_tienda`: primero vínculos (`cod_tienda` en provee),
 * ordenados por menor costo comparable; si no hay vínculos, fallback por `cod_ext` de tienda.
 */
export function elegirListaPrecioProveedorReposicion(params: {
  codTienda: string;
  tienda: TiendaPickReposicion;
  lpPorCodTienda: Map<string, LpRowReposicionResuelto[]>;
  lpPorCodExt?: Map<string, LpRowReposicionResuelto[]>;
  ivaSaldoAcumulado: number;
}): LpRowReposicionResuelto | null {
  const ct = params.codTienda.trim();
  const vinculados = params.lpPorCodTienda.get(ct) ?? [];

  if (vinculados.length > 0) {
    const miembros: (MiembroPrecioComparablePedidoUrgente & LpRowReposicionResuelto)[] =
      vinculados.map((v) => ({
        ...v,
        pxCompraFinalSinIva: v.pxCompraFinalSinIva,
        ivaProveedor: v.ivaProveedor ?? IvaProveedor.PREGUNTA,
        prefijo: v.proveedor.prefijo ?? "",
        codExt: v.codExt,
      }));
    const ordenados = ordenarMiembrosPedidoUrgentePorMenorCostoComparable(
      miembros,
      params.ivaSaldoAcumulado
    );
    return ordenados[0] ?? null;
  }

  const codExtT = (params.tienda.codExt ?? "").trim();
  if (!codExtT) return null;
  const listaLp = params.lpPorCodExt?.get(codExtT) ?? [];
  const legacy = pickListaPrecioProveedorPorCodExtYTienda(listaLp, {
    codTienda: params.tienda.codTienda,
    proveedor: params.tienda.proveedor,
  });
  if (!legacy) return null;
  const match = listaLp.find((r) => r.idProveedor === legacy.idProveedor);
  return match ?? { ...legacy, codExt: codExtT, pxCompraFinalSinIva: null, ivaProveedor: IvaProveedor.PREGUNTA };
}

export async function sumarIvaSaldoParaReposicion(): Promise<number> {
  return sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido();
}

/** Verifica que exista al menos una línea de lista proveedor para configurar reposición. */
export async function existeListaPrecioParaReposicionCodTienda(
  codTienda: string,
  tienda: { codExt: string | null }
): Promise<boolean> {
  const ct = codTienda.trim();
  if (!ct) return false;

  const vinculo = await prisma.listaPrecioProveedor.findFirst({
    where: { codTiendaVinculo: ct, habilitado: true },
    select: { codExt: true },
  });
  if (vinculo) return true;

  const codExt = (tienda.codExt ?? "").trim();
  if (!codExt) return false;

  const porExt = await prisma.listaPrecioProveedor.findFirst({
    where: { codExt, habilitado: true },
    select: { codExt: true },
  });
  return porExt != null;
}
