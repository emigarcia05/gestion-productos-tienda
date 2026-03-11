/**
 * Control de Aumentos: compara el costo registrado en lista_tienda (precios_tienda.costo_compra)
 * con el mismo producto del mismo proveedor en lista_proveedores (precios_proveedores).
 * Solo se considera el proveedor oficial del ítem (precios_tienda.proveedor). En la exportación
 * se muestra el proveedor original (oficial). Solo ítems con variación: |diff| >= UMBRAL.
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

  const oficialNorm = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase();

  for (const r of rows) {
    const costoTienda = toNum(r.costoCompra);
    if (costoTienda <= 0) continue;

    const oficialTienda = oficialNorm(r.proveedor);
    if (!oficialTienda) continue;

    // Mismo producto, mismo proveedor: buscar el ítem de lista_proveedores que corresponde al proveedor oficial del ítem tienda.
    const lpOficial = r.listaPreciosProveedores.find((lp) => {
      const nom = oficialNorm(lp.proveedor?.nombre);
      const pref = oficialNorm(lp.proveedor?.prefijo);
      return nom === oficialTienda || pref === oficialTienda;
    });

    if (!lpOficial) continue;

    let pxCompra: number;
    if (lpOficial.pxCompraFinal != null) {
      pxCompra = toNum(lpOficial.pxCompraFinal);
    } else {
      pxCompra = calcPxCompraFinal(
        toNum(lpOficial.pxListaProveedor),
        lpOficial.dtoRubro,
        lpOficial.dtoCantidad,
        lpOficial.cxTransporte,
        lpOficial.dtoProveedor,
        lpOficial.dtoMarca,
        lpOficial.dtoFinanciero
      );
    }

    const diferenciaNeta = pxCompra - costoTienda;
    if (Math.abs(diferenciaNeta) < UMBRAL_DIFERENCIA_NETA) continue;

    const pctAumento = Math.round((diferenciaNeta / costoTienda) * 100);

    // Proveedor original (oficial) para la exportación.
    const proveedorDux = lpOficial.proveedor?.prefijo ?? lpOficial.proveedor?.nombre ?? r.proveedor?.trim() ?? null;
    const proveedorNombre = lpOficial.proveedor?.nombre ?? r.proveedor?.trim() ?? null;

    individual.push({
      itemId: r.id,
      codItem: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      marca: r.marca ?? null,
      rubro: r.rubro ?? null,
      subRubro: r.subRubro ?? null,
      codigoExterno: r.codExt,
      proveedorDux,
      proveedorNombre,
      costoTienda,
      pxCompraFinal: pxCompra,
      pctAumento,
    });
  }

  const agrupar = (clave: "marca" | "rubro" | "subRubro"): GrupoAumento[] => {
    const mapa = new Map<string, ItemAumento[]>();
    for (const item of individual) {
      const nombre = item[clave] ?? "Sin definir";
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
