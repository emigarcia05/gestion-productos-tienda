import { calcMargenSinIvaPct } from "@/lib/calculos";
import { roundMargenPxListaPct } from "@/lib/pxListasPreciosFormat";
import { prisma } from "@/lib/prisma";

export type FilaExportPxListaMargen = {
  codigo: string;
  porcUtilidad: number;
};

export type ExportPxListaMargenGrupo = {
  idLista: number;
  nombreLista: string;
  filas: FilaExportPxListaMargen[];
};

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Por cada `nombre_lista` en catálogo DUX: ítems con precio efectivo
 * (`prod_tienda_precios_edicion` ?? `prod_tienda_precios`) y margen calculado
 * (`calcMargenSinIvaPct` sobre `costo_compra`).
 */
export async function listarExportPxListasMargenPorLista(): Promise<
  ExportPxListaMargenGrupo[]
> {
  const listas = await prisma.prodTiendaListaPrecio.findMany({
    orderBy: [{ idLista: "asc" }],
    select: { idLista: true, nombreLista: true },
  });

  if (listas.length === 0) return [];

  const idListas = listas.map((l) => l.idLista);

  const [productos, duxRows, edicionRows] = await Promise.all([
    prisma.prodTienda.findMany({
      select: { codTienda: true, costoCompra: true },
      orderBy: { codTienda: "asc" },
    }),
    prisma.prodTiendaPrecio.findMany({
      where: { idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, precio: true },
    }),
    prisma.prodTiendaPrecioEdicion.findMany({
      where: { idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, precio: true },
    }),
  ]);

  const duxMap = new Map<string, number>();
  for (const r of duxRows) {
    duxMap.set(`${r.codTienda}:${r.idLista}`, toNum(r.precio));
  }

  const edicionMap = new Map<string, number>();
  for (const r of edicionRows) {
    edicionMap.set(`${r.codTienda}:${r.idLista}`, toNum(r.precio));
  }

  const filasPorLista = new Map<number, FilaExportPxListaMargen[]>();
  for (const lista of listas) {
    filasPorLista.set(lista.idLista, []);
  }

  for (const prod of productos) {
    const costoCompra = toNum(prod.costoCompra);
    if (!(costoCompra > 0)) continue;

    for (const lista of listas) {
      const key = `${prod.codTienda}:${lista.idLista}`;
      const pxEdicion = edicionMap.get(key) ?? null;
      const pxDux = duxMap.get(key) ?? null;
      const pxEfectivo = pxEdicion ?? pxDux;
      if (pxEfectivo == null || !(pxEfectivo > 0)) continue;

      const margen = calcMargenSinIvaPct(pxEfectivo, costoCompra);
      if (margen == null) continue;

      filasPorLista.get(lista.idLista)!.push({
        codigo: prod.codTienda,
        porcUtilidad: roundMargenPxListaPct(margen),
      });
    }
  }

  return listas.map((lista) => ({
    idLista: lista.idLista,
    nombreLista: lista.nombreLista,
    filas: filasPorLista.get(lista.idLista) ?? [],
  }));
}
