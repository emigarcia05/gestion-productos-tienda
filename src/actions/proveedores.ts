"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { createProveedorSchema } from "@/lib/validations/proveedor";
import * as proveedorService from "@/services/proveedor.service";

// ─── MOCK: productos de prueba (lista de proveedores viene del servicio) ─────

const MOCK_PRODUCTOS = [
  {
    id: "mock-prod-1", codigoExterno: "DEM-001", codProdProv: "001", descripcion: "Producto ejemplo 1",
    precioLista: 100, precioVentaSugerido: 120, descuentoProducto: 0, descuentoCantidad: 0, cxTransporte: 0,
    disponible: true, proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", prefijo: "DEM" },
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "mock-prod-2", codigoExterno: "DEM-002", codProdProv: "002", descripcion: "Producto ejemplo 2",
    precioLista: 200, precioVentaSugerido: 240, descuentoProducto: 5, descuentoCantidad: 0, cxTransporte: 2,
    disponible: true, proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", prefijo: "DEM" },
    createdAt: new Date(), updatedAt: new Date(),
  },
];

export async function getProveedores() {
  return proveedorService.getProveedores();
}

export async function getProveedorById(id: string) {
  const proveedores = await getProveedores();
  const prov = proveedores.find((p) => p.id === id);
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
  const proveedores = await getProveedores();
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const PAGE_SIZE = 50;
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const total = MOCK_PRODUCTOS.length;
  const productos = MOCK_PRODUCTOS.slice(skip, skip + PAGE_SIZE);
  return { proveedores, productos, total, totalPaginas: Math.ceil(total / PAGE_SIZE) };
}

// ─── Crear: validación Zod + servicio (unique constraint → error amigable) ───

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
  };
  const parsed = createProveedorSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg = first.nombre?.[0] ?? first.prefijo?.[0] ?? "Datos inválidos.";
    return { ok: false, error: msg };
  }

  try {
    const { id } = await proveedorService.createProveedor(parsed.data);
    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista");
    revalidatePath("/proveedores/gestion");
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    const isPrisma = e && typeof e === "object" && "code" in e;
    if (isPrisma && (e as { code: string }).code === "P2002") {
      const target = (e as { meta?: { target?: string[] } }).meta?.target;
      if (Array.isArray(target) && target.includes("prefijo"))
        return { ok: false, error: proveedorService.PROVEEDOR_ERROR.PREFIJO_DUPLICADO };
      if (Array.isArray(target) && target.includes("nombre"))
        return { ok: false, error: proveedorService.PROVEEDOR_ERROR.NOMBRE_DUPLICADO };
    }
    const message = e instanceof Error ? e.message : "Error al crear el proveedor.";
    return { ok: false, error: message };
  }
}

// ─── Editar / Eliminar (mock) ───────────────────────────────────────────────

export async function editarProveedor(id: string, formData: FormData): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const nombre = (formData.get("nombre") as string)?.trim();
  const prefijo = (formData.get("prefijo") as string)?.trim().toUpperCase();
  if (!nombre || nombre.length < 2) return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  if (!prefijo || prefijo.length !== 3 || !/^[A-Z]{3}$/.test(prefijo))
    return { ok: false, error: "El prefijo debe tener exactamente 3 letras." };
  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${id}`);
  return { ok: true, data: undefined };
}

export async function eliminarProveedor(id: string): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/proveedores");
  return { ok: true, data: undefined };
}
