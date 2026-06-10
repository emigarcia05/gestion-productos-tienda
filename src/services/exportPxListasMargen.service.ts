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

/** Precisión de comparación de PORC UTILIDAD (4 decimales, igual que la grilla). */
const COMPARACION_MARGEN_FACTOR = 10_000;

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** Difieren dos márgenes % redondeados a 4 decimales. */
export function margenesPorcUtilidadDifieren(
  margenA: number,
  margenB: number
): boolean {
  return (
    Math.round(margenA * COMPARACION_MARGEN_FACTOR) !==
    Math.round(margenB * COMPARACION_MARGEN_FACTOR)
  );
}

function margenDesdePrecio(
  precio: number | null,
  costoCompra: number
): number | null {
  if (precio == null || !(precio > 0) || !(costoCompra > 0)) return null;
  const margen = calcMargenSinIvaPct(precio, costoCompra);
  return margen == null ? null : roundMargenPxListaPct(margen);
}

/**
 * Por cada `nombre_lista`: solo ítems cuyo PORC UTILIDAD efectivo
 * (precio edición ?? precio DUX) **difiere** del calculado solo con precio DUX.
 * Si no hay precio DUX pero sí edición manual, se incluye.
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

      const margenEfectivo = margenDesdePrecio(pxEfectivo, costoCompra);
      if (margenEfectivo == null) continue;

      const margenDux = margenDesdePrecio(pxDux, costoCompra);

      if (margenDux == null) {
        if (pxEdicion == null) continue;
      } else if (!margenesPorcUtilidadDifieren(margenEfectivo, margenDux)) {
        continue;
      }

      filasPorLista.get(lista.idLista)!.push({
        codigo: prod.codTienda,
        porcUtilidad: margenEfectivo,
      });
    }
  }

  return listas.map((lista) => ({
    idLista: lista.idLista,
    nombreLista: lista.nombreLista,
    filas: filasPorLista.get(lista.idLista) ?? [],
  }));
}
