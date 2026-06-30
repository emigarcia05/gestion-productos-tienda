import { roundMargenPxListaPct } from "@/lib/pxListasPreciosFormat";
import {
  armarCeldaPrecioPxListas,
  celdaRequiereActualizar,
} from "@/lib/pxListasPreciosCelda";
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
 * Por cada `nombre_lista`: solo ítems con margen manual guardado cuyo precio DUX
 * aún no coincide (entero) con el PX calculado desde ese margen.
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

  const [productos, duxRows, margenRows] = await Promise.all([
    prisma.prodTienda.findMany({
      select: { codTienda: true, costoCompra: true },
      orderBy: { codTienda: "asc" },
    }),
    prisma.prodTiendaPrecio.findMany({
      where: { idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, precio: true },
    }),
    prisma.prodTiendaMargenEdicion.findMany({
      where: { idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, margenManual: true },
    }),
  ]);

  const duxMap = new Map<string, number>();
  for (const r of duxRows) {
    duxMap.set(`${r.codTienda}:${r.idLista}`, toNum(r.precio));
  }

  const margenManualMap = new Map<string, number>();
  for (const r of margenRows) {
    margenManualMap.set(
      `${r.codTienda}:${r.idLista}`,
      roundMargenPxListaPct(toNum(r.margenManual))
    );
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
      const margenManual = margenManualMap.get(key) ?? null;
      if (margenManual == null) continue;

      const celda = armarCeldaPrecioPxListas({
        idLista: lista.idLista,
        costoCompra,
        pxDux: duxMap.get(key) ?? null,
        margenManual,
      });

      if (!celdaRequiereActualizar(celda)) continue;

      filasPorLista.get(lista.idLista)!.push({
        codigo: prod.codTienda,
        porcUtilidad: margenManual,
      });
    }
  }

  return listas.map((lista) => ({
    idLista: lista.idLista,
    nombreLista: lista.nombreLista,
    filas: filasPorLista.get(lista.idLista) ?? [],
  }));
}
