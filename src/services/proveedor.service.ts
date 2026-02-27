/**
 * Servicio de Proveedores – Conexión a Neon/PostgreSQL vía Prisma.
 */
import { prisma } from "@/lib/prisma";

export interface CreateProveedorInput {
  nombre: string;
  sufijo: string;
}

export interface ProveedorListItem {
  id: string;
  nombre: string;
  codigoUnico: string;
  sufijo: string;
  _count: { productosProveedor: number };
}

export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  SUFIJO_DUPLICADO: "Ya existe un proveedor con ese sufijo.",
} as const;

/**
 * Lista de proveedores desde la base de datos.
 */
export async function getProveedores(): Promise<ProveedorListItem[]> {
  const rows = await prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigoUnico: p.codigoUnico,
    sufijo: p.sufijo,
    _count: { productosProveedor: 0 },
  }));
}

/**
 * Crea un proveedor en la base de datos.
 * codigoUnico se genera a partir del sufijo (normalizado en mayúsculas).
 */
export async function createProveedor(
  input: CreateProveedorInput
): Promise<{ id: string; codigoUnico: string }> {
  const sufijoNorm = input.sufijo.trim().toUpperCase();
  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: input.nombre.trim(),
      sufijo: sufijoNorm,
      codigoUnico: sufijoNorm,
    },
  });
  return { id: proveedor.id, codigoUnico: proveedor.codigoUnico };
}
