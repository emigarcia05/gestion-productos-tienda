"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { prismaCuidSchema } from "@/lib/validations/common";
import { createProveedorSchema, updateProveedorSchema } from "@/lib/validations/proveedor";
import { proveedoresPageParamsSchema } from "@/lib/validations/proveedores";
import * as proveedorService from "@/services/proveedor.service";
import { z } from "zod";

function puedeConsultarCatalogoProveedores(rol: Rol): boolean {
  return (
    puede(rol, PERMISOS.proveedores.sugeridos) ||
    puede(rol, PERMISOS.proveedores.lista) ||
    puede(rol, PERMISOS.listaPrecios.acciones.importarLista)
  );
}

// ─── MOCK: productos de prueba (lista de proveedores viene del servicio) ─────

const MOCK_PRODUCTOS = [
  {
    id: "mock-prod-1", codigoExterno: "DEM-001", codProdProv: "001", descripcion: "Producto ejemplo 1",
    precioLista: 100, precioVentaSugerido: 120, descuentoRubro: 0, descuentoCantidad: 0, cxTransporte: 0,
    disponible: true, proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", prefijo: "DEM" },
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: "mock-prod-2", codigoExterno: "DEM-002", codProdProv: "002", descripcion: "Producto ejemplo 2",
    precioLista: 200, precioVentaSugerido: 240, descuentoRubro: 5, descuentoCantidad: 0, cxTransporte: 2,
    disponible: true, proveedorId: "mock-prov-1",
    proveedor: { id: "mock-prov-1", nombre: "Proveedor Demo", codigoUnico: "DEM", prefijo: "DEM" },
    createdAt: new Date(), updatedAt: new Date(),
  },
];

export async function getProveedores() {
  const rol = await getRol();
  if (!puedeConsultarCatalogoProveedores(rol)) return [];
  return proveedorService.getProveedores();
}

/**
 * Lista únicamente los proveedores con `proveedor_mercaderia = true`.
 * Usada por /gestion-productos/proveedores/lista (tabla "Lista Proveedores").
 * Gate de permisos idéntico a `getProveedores`.
 */
export async function getProveedoresMercaderia() {
  const rol = await getRol();
  if (!puedeConsultarCatalogoProveedores(rol)) return [];
  return proveedorService.getProveedoresMercaderia();
}

/** Datos para la página /proveedores (lista + productos + total). Sin filtros no se cargan productos para navegación más rápida. MOCK. */
export async function getProveedoresPageData(params: {
  q?: string;
  proveedor?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puedeConsultarCatalogoProveedores(rol)) {
    return { proveedores: [], productos: [], total: 0, totalPaginas: 0 };
  }
  const parsedParams = proveedoresPageParamsSchema.safeParse(params);
  const { q = "", proveedor = "" } = parsedParams.success ? parsedParams.data : {};
  const proveedores = await proveedorService.getProveedoresMercaderia();
  const sinFiltros = !q && !proveedor;
  if (sinFiltros) {
    return { proveedores, productos: [], total: 0, totalPaginas: 0 };
  }
  const total = MOCK_PRODUCTOS.length;
  const productos = MOCK_PRODUCTOS;
  return { proveedores, productos, total, totalPaginas: 1 };
}

// ─── Crear: validación Zod + servicio (unique constraint → error amigable) ───

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
    whatsapp: (formData.get("whatsapp") as string) ?? "",
    coeficienteTintometrico:
      (formData.get("coeficienteTintometrico") as string) ?? "",
    plazosPagos: (formData.get("plazosPagos") as string) ?? "",
    proveedorMercaderia:
      (formData.get("proveedorMercaderia") as string | null) ?? "",
  };
  const parsed = createProveedorSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.nombre?.[0] ??
      first.proveedorMercaderia?.[0] ??
      first.prefijo?.[0] ??
      first.whatsapp?.[0] ??
      first.coeficienteTintometrico?.[0] ??
      first.plazosPagos?.[0] ??
      "Datos inválidos.";
    return { ok: false, error: msg };
  }

  try {
    const idProveedorDuxRaw = (formData.get("idProveedorDux") as string | null) ?? "";
    const { id } = await proveedorService.createProveedor({
      ...parsed.data,
      idProveedorDux: idProveedorDuxRaw.trim() || null,
    });
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
      if (Array.isArray(target) && target.includes("codigo_unico"))
        return { ok: false, error: proveedorService.PROVEEDOR_ERROR.CODIGO_UNICO_DUPLICADO };
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
  const idParsed = prismaCuidSchema.safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID de proveedor inválido." };

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
    whatsapp: (formData.get("whatsapp") as string) ?? "",
    coeficienteTintometrico:
      (formData.get("coeficienteTintometrico") as string) ?? "",
    plazosPagos: (formData.get("plazosPagos") as string) ?? "",
    proveedorMercaderia:
      (formData.get("proveedorMercaderia") as string | null) ?? "",
  };
  const parsed = updateProveedorSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.nombre?.[0] ??
      first.proveedorMercaderia?.[0] ??
      first.prefijo?.[0] ??
      first.whatsapp?.[0] ??
      first.coeficienteTintometrico?.[0] ??
      first.plazosPagos?.[0] ??
      "Datos inválidos.";
    return { ok: false, error: msg };
  }

  const idProveedorDuxRaw = (formData.get("idProveedorDux") as string | null) ?? "";
  const idProveedorDux = idProveedorDuxRaw.trim() || null;

  try {
    await proveedorService.updateProveedor({
      id: idParsed.data,
      ...parsed.data,
      idProveedorDux,
    });
    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista");
    revalidatePath("/proveedores/gestion");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    const isPrisma = e && typeof e === "object" && "code" in e;
    if (isPrisma && (e as { code: string }).code === "P2002") {
      const target = (e as { meta?: { target?: string[] } }).meta?.target;
      if (Array.isArray(target) && target.includes("prefijo"))
        return { ok: false, error: proveedorService.PROVEEDOR_ERROR.PREFIJO_DUPLICADO };
      if (Array.isArray(target) && target.includes("codigo_unico"))
        return { ok: false, error: proveedorService.PROVEEDOR_ERROR.CODIGO_UNICO_DUPLICADO };
      if (Array.isArray(target) && target.includes("nombre"))
        return { ok: false, error: proveedorService.PROVEEDOR_ERROR.NOMBRE_DUPLICADO };
    }
    const message = e instanceof Error ? e.message : "Error al editar el proveedor.";
    return { ok: false, error: message };
  }
}

export async function eliminarProveedor(id: string): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const idParsed = prismaCuidSchema.safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID de proveedor inválido." };
  const del = await proveedorService.deleteProveedor(idParsed.data);
  if (!del.success) return { ok: false, error: del.error };
  revalidatePath("/proveedores");
  revalidatePath("/proveedores/lista");
  revalidatePath("/proveedores/gestion");
  return { ok: true, data: undefined };
}

const coeficienteBulkItemSchema = z.object({
  id: prismaCuidSchema,
  coeficienteTintometrico: z
    .number()
    .finite()
    .gt(0, "El coeficiente debe ser mayor a 0.")
    .max(999999, "El coeficiente es demasiado grande."),
});

const coeficienteBulkSchema = z
  .array(coeficienteBulkItemSchema)
  .min(1, "No hay proveedores para actualizar.")
  .max(1000, "Demasiados proveedores.");

export async function actualizarCoeficientesTintometricosAction(
  raw: unknown
): Promise<ActionResult<{ actualizados: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const parsed = coeficienteBulkSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      [...Object.values(parsed.error.flatten().fieldErrors).flat(), ...parsed.error.flatten().formErrors][0] ??
      "Datos inválidos.";
    return { ok: false, error: first };
  }

  await proveedorService.updateCoeficientesTintometricos(parsed.data);
  revalidatePath("/stock");
  revalidatePath("/proveedores");
  revalidatePath("/proveedores/lista");
  revalidatePath("/proveedores/gestion");
  revalidatePath("/tienda/tintometrico");
  revalidatePath("/tienda/litros");
  return { ok: true, data: { actualizados: parsed.data.length } };
}
