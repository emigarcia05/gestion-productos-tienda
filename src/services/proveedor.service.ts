/**
 * Servicio de Proveedores – Capa de datos (Neon/Prisma).
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

/** Códigos de error para constraint unique (Prisma P2002). */
export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  SUFIJO_DUPLICADO: "Ya existe un proveedor con ese sufijo.",
} as const;

/**
 * Lista de proveedores desde Neon.
 */
export async function getProveedores(): Promise<ProveedorListItem[]> {
  const list = await prisma.proveedor.findMany({
    orderBy: { nombre: "asc" },
  });
  return list.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigoUnico: p.codigoUnico,
    sufijo: p.sufijo,
    _count: { productosProveedor: 0 },
  }));
}

/**
 * Crea un proveedor en Neon. Lanza error amigable si nombre o sufijo ya existen (unique).
 */
export async function createProveedor(
  input: CreateProveedorInput
): Promise<{ id: string; codigoUnico: string }> {
  const nombreNorm = input.nombre.trim();
  const sufijoNorm = input.sufijo.trim().toUpperCase();

  try {
    const created = await prisma.proveedor.create({
      data: {
        nombre: nombreNorm,
        sufijo: sufijoNorm,
        codigoUnico: sufijoNorm,
      },
    });
    return { id: created.id, codigoUnico: created.codigoUnico };
  } catch (e: unknown) {
    const prismaError = e as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === "P2002" && Array.isArray(prismaError.meta?.target)) {
      const target = prismaError.meta.target as string[];
      if (target.includes("nombre")) throw new Error(PROVEEDOR_ERROR.NOMBRE_DUPLICADO);
      if (target.includes("sufijo")) throw new Error(PROVEEDOR_ERROR.SUFIJO_DUPLICADO);
    }
    throw e;
  }
}
