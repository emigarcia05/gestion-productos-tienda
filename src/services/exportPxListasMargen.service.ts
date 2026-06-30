import { roundPxListaEntero } from "@/lib/pxListasPreciosFormat";
import { type ClavePrecioListaEdicion } from "@/services/pxListasPrecioEdicion.service";
import { prisma } from "@/lib/prisma";

export type FilaExportPxListaMargen = {
  codigo: string;
  importe: number;
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

/** Claves exportadas (para limpiar staging tras Act. Px). */
export function clavesDesdeGruposExportPxListas(
  grupos: ExportPxListaMargenGrupo[]
): ClavePrecioListaEdicion[] {
  const claves: ClavePrecioListaEdicion[] = [];
  for (const grupo of grupos) {
    for (const fila of grupo.filas) {
      claves.push({ codTienda: fila.codigo, idLista: grupo.idLista });
    }
  }
  return claves;
}

/**
 * Por cada `nombre_lista`: ítems con PX en `prod_tienda_precios_edicion` (pendientes de Act. Px).
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

  const edicionRows = await prisma.prodTiendaPrecioEdicion.findMany({
    where: { idLista: { in: idListas } },
    select: { codTienda: true, idLista: true, precio: true },
    orderBy: [{ codTienda: "asc" }],
  });

  const filasPorLista = new Map<number, FilaExportPxListaMargen[]>();
  for (const lista of listas) {
    filasPorLista.set(lista.idLista, []);
  }

  for (const row of edicionRows) {
    const pxEdicion = toNum(row.precio);
    if (!(pxEdicion > 0)) continue;

    filasPorLista.get(row.idLista)?.push({
      codigo: row.codTienda,
      importe: roundPxListaEntero(pxEdicion),
    });
  }

  return listas.map((lista) => ({
    idLista: lista.idLista,
    nombreLista: lista.nombreLista,
    filas: filasPorLista.get(lista.idLista) ?? [],
  }));
}
