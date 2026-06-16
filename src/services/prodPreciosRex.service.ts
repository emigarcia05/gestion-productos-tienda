/**
 * Catálogo prod_precios_rex — precios por proveedor desde conversión PDF matriz.
 * Upsert por clave (id_proveedor, descripcion normalizada).
 */

import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { normalizarDescripcionPrecioRex } from "@/lib/listaPreciosPdfMatriz";
import type { FilaPdfMatrizNormalizadaDto } from "@/lib/validations/parseListaPreciosPdfMatriz";
import type { Prisma } from "@prisma/client";

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

export interface PrecioRexParaVincular {
  id: string;
  descripcion: string;
  precio: number;
  /** Si el ítem REX ya está vinculado a otra fila `prod_precios_provee`. */
  listaPrecioVinculada: { codExt: string; descripcionProveedor: string } | null;
}

const MAX_PRECIOS_REX_VINCULAR = 500;

/** Lista ítems REX del mismo proveedor para modal de vinculación en Lista Precios. */
export async function listarPreciosRexParaVincular(
  proveedorId: string,
  codExtLista: string,
  q?: string
): Promise<PrecioRexParaVincular[]> {
  const andParts: Prisma.ProdPrecioRexWhereInput[] = [{ idProveedor: proveedorId }];
  const textFilter = filtroTexto(q ?? "", ["descripcion"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  const where: Prisma.ProdPrecioRexWhereInput = { AND: andParts };

  const rows = await prisma.prodPrecioRex.findMany({
    where,
    include: {
      listaPrecioProveedor: {
        select: { codExt: true, descripcionProveedor: true },
      },
    },
    orderBy: { descripcion: "asc" },
    take: MAX_PRECIOS_REX_VINCULAR,
  });

  return rows.map((r) => ({
    id: r.id,
    descripcion: r.descripcion,
    precio: Number(r.precio),
    listaPrecioVinculada:
      r.listaPrecioProveedor && r.listaPrecioProveedor.codExt !== codExtLista
        ? {
            codExt: r.listaPrecioProveedor.codExt,
            descripcionProveedor: r.listaPrecioProveedor.descripcionProveedor,
          }
        : null,
  }));
}

export type VincularListaPrecioConPrecioRexResult =
  | { ok: true }
  | { ok: false; error: string };

/** Vincula 1:1 una fila lista proveedor con un ítem REX del mismo proveedor. */
export async function vincularListaPrecioConPrecioRex(
  codExtLista: string,
  idPrecioRex: string
): Promise<VincularListaPrecioConPrecioRexResult> {
  const [lista, rex] = await Promise.all([
    prisma.listaPrecioProveedor.findUnique({
      where: { codExt: codExtLista },
      select: { codExt: true, idProveedor: true, idPrecioRex: true },
    }),
    prisma.prodPrecioRex.findUnique({
      where: { id: idPrecioRex },
      include: {
        listaPrecioProveedor: { select: { codExt: true } },
      },
    }),
  ]);

  if (!lista) {
    return { ok: false, error: "Producto de lista no encontrado." };
  }
  if (!rex) {
    return { ok: false, error: "Precio REX no encontrado." };
  }
  if (lista.idProveedor !== rex.idProveedor) {
    return { ok: false, error: "El precio REX pertenece a otro proveedor." };
  }
  if (
    rex.listaPrecioProveedor &&
    rex.listaPrecioProveedor.codExt !== codExtLista
  ) {
    return {
      ok: false,
      error: "Este precio REX ya está vinculado a otro producto de lista.",
    };
  }

  if (lista.idPrecioRex === idPrecioRex) {
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    if (lista.idPrecioRex && lista.idPrecioRex !== idPrecioRex) {
      await tx.listaPrecioProveedor.update({
        where: { codExt: codExtLista },
        data: { idPrecioRex: null },
      });
    }
    await tx.listaPrecioProveedor.update({
      where: { codExt: codExtLista },
      data: { idPrecioRex },
    });
  });

  return { ok: true };
}
