/**
 * Servicio de Proveedores – Conexión a Neon/PostgreSQL vía Prisma.
 */
import { prisma } from "@/lib/prisma";

export interface CreateProveedorInput {
  nombre: string;
  prefijo: string;
}

export interface ProveedorListItem {
  id: string;
  nombre: string;
  codigoUnico: string;
  prefijo: string;
  _count: { productosProveedor: number };
}

export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  PREFIJO_DUPLICADO: "Ya existe un proveedor con ese prefijo.",
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
    prefijo: p.prefijo,
    _count: { productosProveedor: 0 },
  }));
}

/**
 * Crea un proveedor en la base de datos.
 * codigoUnico se genera a partir del prefijo (normalizado en mayúsculas).
 */
export async function createProveedor(
  input: CreateProveedorInput
): Promise<{ id: string; codigoUnico: string }> {
  const prefijoNorm = input.prefijo.trim().toUpperCase();
  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: input.nombre.trim(),
      prefijo: prefijoNorm,
      codigoUnico: prefijoNorm,
    },
  });
  return { id: proveedor.id, codigoUnico: proveedor.codigoUnico };
}
