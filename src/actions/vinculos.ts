"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import {
  getProductosVinculadosPorItemTienda,
  buscarProductos as buscarProductosService,
} from "@/services/producto.service";

// ─── MOCK: sin Prisma; respuestas de prueba ─────────────────────────────────

const MOCK_PROVEEDORES = [
  { id: "mock-prov-1", nombre: "Proveedor A", prefijo: "PVA" },
  { id: "mock-prov-2", nombre: "Proveedor B", prefijo: "PVB" },
];

export async function getVinculos(itemTiendaId: string): Promise<ServiceResult<ProductoCompleto[]>> {
  return getProductosVinculadosPorItemTienda(itemTiendaId);
}

export async function getProveedores() {
  return MOCK_PROVEEDORES;
}

export async function buscarProductos(
  q: string,
  excluirItemTiendaId: string,
  proveedorId?: string
): Promise<ServiceResult<ProductoCompleto[]>> {
  return buscarProductosService(q, excluirItemTiendaId, proveedorId);
}

export async function vincularProducto(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}

export async function desvincularProducto(
  itemTiendaId: string,
  _productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}

export async function autoVincular(itemTiendaId: string): Promise<ActionResult<{ vinculados: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: { vinculados: 0 } };
}
