/**
 * Servicio de Proveedores – Conexión a Neon/PostgreSQL vía Prisma.
 */
import { prisma } from "@/lib/prisma";

export interface CreateProveedorInput {
  nombre: string;
  prefijo: string;
  idProveedorDux?: string | null;
}

export interface UpdateProveedorInput {
  id: string;
  nombre: string;
  prefijo: string;
  idProveedorDux?: string | null;
}

export interface ProveedorListItem {
  id: string;
  nombre: string;
  codigoUnico: string;
  prefijo: string;
  /** ID del proveedor en DUX (si está configurado). */
  idProveedorDux: string | null;
  /** Cantidad de ítems en precios_proveedores. */
  cantProductos: number;
  /** Cantidad de ítems del proveedor vinculados a lista_precios_tienda. */
  cantProductosProvistos: number;
}

export const PROVEEDOR_ERROR = {
  NOMBRE_DUPLICADO: "Ya existe un proveedor con ese nombre.",
  PREFIJO_DUPLICADO: "Ya existe un proveedor con ese prefijo.",
} as const;

/**
 * Lista de proveedores desde la base de datos con conteos en precios_proveedores y lista_precios_tienda.
 */
export async function getProveedores(): Promise<ProveedorListItem[]> {
  const [rows, provistosByProveedor] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { listaPrecios: true } } },
    }),
    prisma.listaPrecioProveedor.groupBy({
      by: ["idProveedor"],
      where: { idListaPrecioTienda: { not: null } },
      _count: { id: true },
    }),
  ]);

  const provistosMap = new Map(
    provistosByProveedor.map((g) => [g.idProveedor, g._count.id])
  );

  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigoUnico: p.codigoUnico,
    prefijo: p.prefijo,
    idProveedorDux: p.idProveedorDux ?? null,
    cantProductos: p._count.listaPrecios,
    cantProductosProvistos: provistosMap.get(p.id) ?? 0,
  }));
}

/** Obtiene un proveedor por id (para validaciones sin cargar toda la lista). */
export async function getProveedorById(id: string): Promise<Pick<ProveedorListItem, "id" | "nombre" | "prefijo"> | null> {
  const p = await prisma.proveedor.findUnique({
    where: { id },
    select: { id: true, nombre: true, prefijo: true },
  });
  return p;
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
      idProveedorDux: input.idProveedorDux?.trim() || null,
    },
  });
  return { id: proveedor.id, codigoUnico: proveedor.codigoUnico };
}

/**
 * Actualiza un proveedor existente en la base de datos.
 */
export async function updateProveedor(
  input: UpdateProveedorInput
): Promise<void> {
  const prefijoNorm = input.prefijo.trim().toUpperCase();
  await prisma.proveedor.update({
    where: { id: input.id },
    data: {
      nombre: input.nombre.trim(),
      prefijo: prefijoNorm,
      idProveedorDux: input.idProveedorDux?.trim() || null,
    },
  });
}
