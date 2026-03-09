/**
 * Control de Aumentos: compara precios_tienda con precios_proveedores vinculados por id_lista_precios_tienda.
 * Solo se consideran ítems con variación: diferencia neta en pesos >= UMBRAL (evita ruido por redondeos).
 * Resúmenes agrupados por MARCA, RUBRO, SUB-RUBRO; aumentos en porcentaje sin decimales.
 */

import { prisma } from "@/lib/prisma";
import { calcPxCompraFinal } from "@/lib/calculos";
import type { ItemAumento, GrupoAumento, ControlAumentosData } from "@/actions/tienda";

/** Diferencia neta mínima (en pesos) para considerar que hay aumento. |diff| < 1 → no cuenta. */
const UMBRAL_DIFERENCIA_NETA = 1;

function toNum(n: unknown): number {
  if (n == null || n === "") return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export async function getControlAumentosData(): Promise<ControlAumentosData> {
  const rows = await prisma.listaPrecioTienda.findMany({
    where: {
      listaPreciosProveedores: {
        some: { idListaPrecioTienda: { not: null } },
      },
    },
    select: {
      id: true,
      codTienda: true,
      codExt: true,
      descripcionTienda: true,
      marca: true,
      rubro: true,
      subRubro: true,
      proveedor: true,
      costoCompra: true,
      listaPreciosProveedores: {
        where: { idListaPrecioTienda: { not: null } },
        select: {
          pxCompraFinal: true,
          pxListaProveedor: true,
          dtoProveedor: true,
          dtoMarca: true,
          dtoRubro: true,
          dtoCantidad: true,
          dtoFinanciero: true,
          cxTransporte: true,
          proveedor: { select: { nombre: true, prefijo: true } },
        },
      },
    },
    orderBy: { descripcionTienda: "asc" },
  });

  const individual: ItemAumento[] = [];

  for (const r of rows) {
    const costoTienda = toNum(r.costoCompra);
    if (costoTienda <= 0) continue;

    let minPx = Infinity;
    let proveedorDux: string | null = r.proveedor?.trim() ?? null;

    for (const lp of r.listaPreciosProveedores) {
      let px: number;
      if (lp.pxCompraFinal != null) {
        px = toNum(lp.pxCompraFinal);
      } else {
        px = calcPxCompraFinal(
          toNum(lp.pxListaProveedor),
          lp.dtoRubro,
          lp.dtoCantidad,
          lp.cxTransporte,
          lp.dtoProveedor,
          lp.dtoMarca,
          lp.dtoFinanciero
        );
      }
      if (px < minPx) {
        minPx = px;
        proveedorDux = lp.proveedor?.prefijo ?? lp.proveedor?.nombre ?? proveedorDux;
      }
    }

    if (!Number.isFinite(minPx)) continue;

    const diferenciaNeta = minPx - costoTienda;
    if (Math.abs(diferenciaNeta) < UMBRAL_DIFERENCIA_NETA) continue;

    const pctAumento = Math.round((diferenciaNeta / costoTienda) * 100);

    individual.push({
      itemId: r.id,
      codItem: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      marca: r.marca ?? null,
      rubro: r.rubro ?? null,
      subRubro: r.subRubro ?? null,
      codigoExterno: r.codExt,
      proveedorDux,
      costoTienda,
      pxCompraFinal: minPx,
      pctAumento,
    });
  }

  const agrupar = (clave: "marca" | "rubro" | "subRubro"): GrupoAumento[] => {
    const mapa = new Map<string, ItemAumento[]>();
    const keyLabel = clave === "marca" ? "marca" : clave === "rubro" ? "rubro" : "subRubro";
    for (const item of individual) {
      const nombre = item[keyLabel] ?? "Sin definir";
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre)!.push(item);
    }
    return Array.from(mapa.entries()).map(([nombre, items]) => {
      const pctPromedio = items.reduce((s, i) => s + i.pctAumento, 0) / items.length;
      const subiendo = items.filter((i) => i.pctAumento > 0).length;
      const bajando = items.filter((i) => i.pctAumento < 0).length;
      return {
        nombre,
        cantidad: items.length,
        pctPromedio: Math.round(pctPromedio),
        subiendo,
        bajando,
      };
    });
  };

  const porMarca = agrupar("marca").sort((a, b) => Math.abs(b.pctPromedio) - Math.abs(a.pctPromedio));
  const porRubro = agrupar("rubro").sort((a, b) => Math.abs(b.pctPromedio) - Math.abs(a.pctPromedio));
  const porSubRubro = agrupar("subRubro").sort((a, b) => Math.abs(b.pctPromedio) - Math.abs(a.pctPromedio));

  return {
    porMarca,
    porRubro,
    porSubRubro,
    individual,
  };
}
