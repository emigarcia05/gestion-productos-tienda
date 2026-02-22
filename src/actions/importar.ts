"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";
import { parsearContenido, type FilaProducto } from "@/lib/parsearImport";

export type { FilaProducto } from "@/lib/parsearImport";

export interface ImportResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

export async function importarProductos(
  proveedorId: string,
  contenido: string,
  tieneEncabezados: boolean = true
): Promise<ImportResult> {
  if (!proveedorId) throw new Error("Debe seleccionar un proveedor.");
  if (!contenido.trim()) throw new Error("El contenido está vacío.");

  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor) throw new Error("Proveedor no encontrado.");

  let filas: FilaProducto[];
  try {
    filas = parsearContenido(contenido, tieneEncabezados);
  } catch (e) {
    throw new Error(`Error al parsear el archivo: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (filas.length === 0) throw new Error("No se encontraron filas válidas.");

  const errores: string[] = [];
  let creados = 0;
  let actualizados = 0;
  let eliminados = 0;

  const codExtsEntrantes = new Set<string>();
  const filasValidas: (FilaProducto & { codExt: string })[] = [];

  for (const fila of filas) {
    try {
      const codExt = buildCodExt(proveedor.sufijo, fila.codProdProv);
      codExtsEntrantes.add(codExt);
      filasValidas.push({ ...fila, codExt });
    } catch (e) {
      errores.push(`Fila ${fila.codProdProv}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const fila of filasValidas) {
      const existente = await tx.producto.findUnique({ where: { codExt: fila.codExt } });

      if (existente) {
        await tx.producto.update({
          where: { codExt: fila.codExt },
          data: {
            descripcion: fila.descripcion,
            precioLista: fila.precioLista,
            precioVentaSugerido: fila.precioVentaSugerido,
          },
        });
        actualizados++;
      } else {
        await tx.producto.create({
          data: {
            codProdProv: fila.codProdProv,
            codExt: fila.codExt,
            descripcion: fila.descripcion,
            precioLista: fila.precioLista,
            precioVentaSugerido: fila.precioVentaSugerido,
            proveedorId,
          },
        });
        creados++;
      }
    }

    const { count } = await tx.producto.deleteMany({
      where: {
        proveedorId,
        codExt: { notIn: Array.from(codExtsEntrantes) },
      },
    });
    eliminados = count;
  });

  await prisma.importLog.create({
    data: {
      filename: "importacion-manual",
      status: "completed",
      totalRows: filas.length,
      creados,
      actualizados,
      eliminados,
      errores: errores.length,
      proveedorId,
    },
  });

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${proveedorId}`);

  return { creados, actualizados, eliminados, errores };
}
