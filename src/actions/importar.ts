"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";

export interface FilaProducto {
  codProdProv: string;
  descripcion: string;
  precioLista: number;
  precioVentaSugerido: number;
}

export interface ImportResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

/**
 * Parsea texto CSV o JSON y devuelve filas normalizadas.
 * Columnas CSV esperadas (case-insensitive, orden libre):
 *   COD PROD PROV | DESCRIPCION | PX LISTA PROVEEDOR | PX VENTA SUGERIDO
 */
export function parsearContenido(raw: string): FilaProducto[] {
  const trimmed = raw.trim();

  // ── JSON ──────────────────────────────────────────────────────────────────
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>[];
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map(normalizeRow);
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("El archivo debe tener encabezado y al menos una fila.");

  const headers = lines[0].split(/[,;|\t]/).map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const cols = line.split(/[,;|\t]/).map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return normalizeRow(row);
  });
}

function normalizeRow(row: Record<string, unknown>): FilaProducto {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
    return "";
  };

  const codProdProv = get("cod prod prov", "codprodprov", "cod_prod_prov", "codigo");
  const descripcion = get("descripcion", "descripción", "description", "desc");
  const precioListaRaw = get("px lista proveedor", "pxlistaproveedor", "px_lista_proveedor", "preciolista", "precio_lista");
  const precioVentaRaw = get("px venta sugerido", "pxventasugerido", "px_venta_sugerido", "precioventasugerido", "precio_venta");

  if (!codProdProv) throw new Error(`Fila sin código de producto: ${JSON.stringify(row)}`);

  const precioLista = parseFloat(precioListaRaw.replace(",", "."));
  const precioVentaSugerido = parseFloat(precioVentaRaw.replace(",", "."));

  if (isNaN(precioLista)) throw new Error(`Precio lista inválido en fila: ${codProdProv}`);
  if (isNaN(precioVentaSugerido)) throw new Error(`Precio venta inválido en fila: ${codProdProv}`);

  return { codProdProv, descripcion, precioLista, precioVentaSugerido };
}

// ─── Action principal ──────────────────────────────────────────────────────

export async function importarProductos(
  proveedorId: string,
  contenido: string
): Promise<ImportResult> {
  if (!proveedorId) throw new Error("Debe seleccionar un proveedor.");
  if (!contenido.trim()) throw new Error("El contenido está vacío.");

  const proveedor = await prisma.proveedor.findUnique({ where: { id: proveedorId } });
  if (!proveedor) throw new Error("Proveedor no encontrado.");

  let filas: FilaProducto[];
  try {
    filas = parsearContenido(contenido);
  } catch (e) {
    throw new Error(`Error al parsear el archivo: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (filas.length === 0) throw new Error("No se encontraron filas válidas.");

  const errores: string[] = [];
  let creados = 0;
  let actualizados = 0;
  let eliminados = 0;

  // Construir mapa de codExt entrantes para la limpieza posterior
  const codExtsEntrantes = new Set<string>();
  const filasValidas: (FilaProducto & { codExt: string })[] = [];

  for (const fila of filas) {
    try {
      const codExt = buildCodExt(proveedor.codigoUnico, fila.codProdProv);
      codExtsEntrantes.add(codExt);
      filasValidas.push({ ...fila, codExt });
    } catch (e) {
      errores.push(`Fila ${fila.codProdProv}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Transacción ───────────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 1. Upsert de cada producto
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

    // 2. Eliminar productos del proveedor que NO estaban en el archivo
    const { count } = await tx.producto.deleteMany({
      where: {
        proveedorId,
        codExt: { notIn: Array.from(codExtsEntrantes) },
      },
    });
    eliminados = count;
  });

  // Registrar log
  await prisma.importLog.create({
    data: {
      filename: `importacion-manual`,
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
