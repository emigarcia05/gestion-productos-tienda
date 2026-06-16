/**
 * Catálogo prod_precios_rex — precios por proveedor desde conversión PDF matriz.
 * Upsert por clave (id_proveedor, descripcion normalizada).
 */

import { prisma } from "@/lib/prisma";
import { normalizarDescripcionPrecioRex } from "@/lib/listaPreciosPdfMatriz";
import type { FilaPdfMatrizNormalizadaDto } from "@/lib/validations/parseListaPreciosPdfMatriz";

export interface UpsertPreciosRexResult {
  creados: number;
  actualizados: number;
  errores: string[];
}

const CHUNK_PREFETCH = 500;

function deduplicarFilasPorDescripcion(
  filas: FilaPdfMatrizNormalizadaDto[]
): Array<{ descripcion: string; precio: number }> {
  const porDescripcion = new Map<string, number>();
  for (const fila of filas) {
    const descripcion = normalizarDescripcionPrecioRex(fila.descripcionExport);
    if (!descripcion) continue;
    porDescripcion.set(descripcion, fila.precio);
  }
  return [...porDescripcion.entries()].map(([descripcion, precio]) => ({ descripcion, precio }));
}

/**
 * Inserta o actualiza precios REX para un proveedor.
 * Misma descripción en el lote: gana el último precio.
 */
export async function upsertPreciosRexDesdeFilasPdf(
  proveedorId: string,
  filas: FilaPdfMatrizNormalizadaDto[]
): Promise<UpsertPreciosRexResult> {
  const filasUnicas = deduplicarFilasPorDescripcion(filas);
  if (filasUnicas.length === 0) {
    return { creados: 0, actualizados: 0, errores: ["No hay filas con descripción válida para guardar."] };
  }

  const existentesSet = new Set<string>();
  const descripciones = filasUnicas.map((f) => f.descripcion);

  for (let i = 0; i < descripciones.length; i += CHUNK_PREFETCH) {
    const chunk = descripciones.slice(i, i + CHUNK_PREFETCH);
    const existentes = await prisma.prodPrecioRex.findMany({
      where: { idProveedor: proveedorId, descripcion: { in: chunk } },
      select: { descripcion: true },
    });
    for (const row of existentes) existentesSet.add(row.descripcion);
  }

  let creados = 0;
  let actualizados = 0;
  const errores: string[] = [];

  for (const fila of filasUnicas) {
    try {
      const existia = existentesSet.has(fila.descripcion);

      await prisma.prodPrecioRex.upsert({
        where: {
          idProveedor_descripcion: {
            idProveedor: proveedorId,
            descripcion: fila.descripcion,
          },
        },
        create: {
          idProveedor: proveedorId,
          descripcion: fila.descripcion,
          precio: fila.precio,
        },
        update: {
          precio: fila.precio,
        },
      });

      if (existia) actualizados++;
      else {
        creados++;
        existentesSet.add(fila.descripcion);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      errores.push(`${fila.descripcion}: ${msg}`);
    }
  }

  return { creados, actualizados, errores };
}
