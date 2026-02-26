"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";

// ─── MOCK: sin Prisma; datos de prueba ──────────────────────────────────────

const MOCK_PROVEEDORES = [
  { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", sufijo: "DEM", _count: { productosProveedor: 2 } },
  { id: "mock-prov-2", nombre: "Otro Proveedor", codigoUnico: "OTR", sufijo: "OTR", _count: { productosProveedor: 0 } },
];

const MOCK_PRODUCTOS = [
  {
    id: "mock-prod-1", codigoExterno: "DEM-001", codProdProv: "001", descripcion: "Producto ejemplo 1",
    precioLista: 100, precioVentaSugerido: 120, descuentoProducto: 0, descuentoCantidad: 0, cxTransporte: 0,
    disponible: true, proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", sufijo: "DEM" },
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "mock-prod-2", codigoExterno: "DEM-002", codProdProv: "002", descripcion: "Producto ejemplo 2",
    precioLista: 200, precioVentaSugerido: 240, descuentoProducto: 5, descuentoCantidad: 0, cxTransporte: 2,
    disponible: true, proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", sufijo: "DEM" },
    createdAt: new Date(), updatedAt: new Date(),
  },
];

export async function getProveedores() {
  return MOCK_PROVEEDORES;
}

export async function getProveedorById(id: string) {
  const prov = MOCK_PROVEEDORES.find((p) => p.id === id);
  if (!prov) return null;
  const productosProveedor = MOCK_PRODUCTOS.filter((p) => p.proveedorId === id);
  return { ...prov, codigoUnico: prov.codigoUnico, productosProveedor, _count: { productosProveedor: productosProveedor.length } };
}

/** Datos para la página /proveedores (lista + productos + total). MOCK. */
export async function getProveedoresPageData(params: {
  q?: string;
  proveedor?: string;
  pagina?: string;
}) {
  const { pagina = "1" } = params;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const PAGE_SIZE = 50;
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const total = MOCK_PRODUCTOS.length;
  const productos = MOCK_PRODUCTOS.slice(skip, skip + PAGE_SIZE);
  return { proveedores: MOCK_PROVEEDORES, productos, total, totalPaginas: Math.ceil(total / PAGE_SIZE) };
}

// ─── Crear (mock) ──────────────────────────────────────────────────────────

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  const sufijo = (formData.get("sufijo") as string)?.trim().toUpperCase();
  if (!nombre || nombre.length < 2) return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  if (!sufijo || sufijo.length !== 3 || !/^[A-Z]{3}$/.test(sufijo))
    return { ok: false, error: "El sufijo debe tener exactamente 3 letras." };
  revalidatePath("/proveedores");
  return { ok: true, data: { id: "mock-new-" + Date.now() } };
}

// ─── Editar / Eliminar (mock) ───────────────────────────────────────────────

export async function editarProveedor(id: string, formData: FormData): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  const sufijo = (formData.get("sufijo") as string)?.trim().toUpperCase();
  if (!nombre || nombre.length < 2) return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  if (!sufijo || sufijo.length !== 3 || !/^[A-Z]{3}$/.test(sufijo))
    return { ok: false, error: "El sufijo debe tener exactamente 3 letras." };
  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);
  return { ok: true, data: undefined };
}

export async function eliminarProveedor(id: string): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/proveedores");
  return { ok: true, data: undefined };
}
