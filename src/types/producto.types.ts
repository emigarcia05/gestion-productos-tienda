/**
 * Tipos para Producto + Proveedor. Definidos desde Prisma para evitar casts y mantener
 * un único contrato entre capa de datos y UI.
 */
import type { Prisma } from "@prisma/client";

/** Select mínimo de proveedor para listados y detalle (Single Source of Truth con schema). */
const PROVEEDOR_SELECT = { id: true, nombre: true, sufijo: true } as const;

export type ProveedorResumen = Prisma.ProveedorGetPayload<{ select: typeof PROVEEDOR_SELECT }>;

/** Producto de Lista Proveedores con proveedor siempre presente (inferido del schema Prisma). */
export type ProductoCompleto = Prisma.ProductoProveedorGetPayload<{
  include: { proveedor: { select: typeof PROVEEDOR_SELECT } };
}>;
