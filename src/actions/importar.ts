"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";
import { aplicarMapeo, type FilaProducto, type MapeoColumnas } from "@/lib/parsearImport";
import { esEditor } from "@/lib/sesion";

export type { FilaProducto, MapeoColumnas } from "@/lib/parsearImport";

export interface ImportResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

export async function importarProductos(
  proveedorId: string,
  filasCrudas: string[][],
  mapeo: MapeoColumnas
): Promise<ImportResult> {
  if (!(await esEditor())) throw new Error("Sin permisos de editor.");
  if (!proveedorId) throw new Error("Debe seleccionar un proveedor.");
  if (!filasCrudas.length) throw new Error("No hay filas para importar.");

  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor) throw new Error("Proveedor no encontrado.");

  let filas: FilaProducto[];
  try {
    filas = aplicarMapeo(filasCrudas, mapeo);
  } catch (e) {
    throw new Error(`Error al procesar datos: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (filas.length === 0) throw new Error("No se encontraron filas válidas.");

  const errores: string[] = [];

  // Construir mapa codigoExterno → datos para todas las filas entrantes
  const mapaEntrante = new Map<string, FilaProducto & { codigoExterno: string }>();
  for (const fila of filas) {
    try {
      const codigoExterno = buildCodExt(proveedor.sufijo, fila.codProdProv);
      mapaEntrante.set(codigoExterno, { ...fila, codigoExterno });
    } catch (e) {
      errores.push(`${fila.codProdProv}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const codigosEntrantes = Array.from(mapaEntrante.keys());

  // Traer todos los productos existentes del proveedor en una sola query
  const existentes = await prisma.productoProveedor.findMany({
    where: { proveedorId },
    select: { codigoExterno: true },
  });
  const setExistentes = new Set(existentes.map((p) => p.codigoExterno));

  // Separar en crear vs actualizar
  const paraCrear = codigosEntrantes
    .filter((c) => !setExistentes.has(c))
    .map((c) => {
      const f = mapaEntrante.get(c)!;
      return {
        codProdProv: f.codProdProv,
        codigoExterno: f.codigoExterno,
        descripcion: f.descripcion,
        precioLista: f.precioLista,
        precioVentaSugerido: f.precioVentaSugerido,
        proveedorId,
      };
    });

  const paraActualizar = codigosEntrantes.filter((c) => setExistentes.has(c));

  // Ejecutar todo en paralelo con Promise.all — sin transacción interactiva
  const LOTE = 500;

  // Crear en lotes
  let creados = 0;
  for (let i = 0; i < paraCrear.length; i += LOTE) {
    const lote = paraCrear.slice(i, i + LOTE);
    const res = await prisma.productoProveedor.createMany({ data: lote, skipDuplicates: true });
    creados += res.count;
  }

  // Actualizar en paralelo por lotes de 200 — preserva campos manuales
  let actualizados = 0;
  for (let i = 0; i < paraActualizar.length; i += LOTE) {
    const lote = paraActualizar.slice(i, i + LOTE);
    await Promise.all(
      lote.map((codigoExterno) => {
        const f = mapaEntrante.get(codigoExterno)!;
        return prisma.productoProveedor.update({
          where: { codigoExterno },
          data: {
            descripcion:         f.descripcion,
            precioLista:         f.precioLista,
            precioVentaSugerido: f.precioVentaSugerido,
            // descuentoProducto, descuentoCantidad, cxTransporte, disponible NO se tocan
          },
        });
      })
    );
    actualizados += lote.length;
  }

  // Eliminar productos del proveedor que no estaban en el archivo
  const { count: eliminados } = await prisma.productoProveedor.deleteMany({
    where: {
      proveedorId,
      codigoExterno: { notIn: codigosEntrantes },
    },
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
