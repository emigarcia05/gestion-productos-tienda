"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { prismaCuidSchema } from "@/lib/validations/common";
import { createProveedorSchema, updateProveedorSchema } from "@/lib/validations/proveedor";
import { proveedoresPageParamsSchema } from "@/lib/validations/proveedores";
import * as proveedorService from "@/services/proveedor.service";
import { getProductosProveedoresPageFiltrados } from "@/services/listaPrecios.service";
import type { ProductoProveedoresPage } from "@/lib/productoProveedoresPage";
import { z } from "zod";

function puedeConsultarCatalogoProveedores(rol: Rol): boolean {
  return (
    puede(rol, PERMISOS.proveedores.sugeridos) ||
    puede(rol, PERMISOS.proveedores.lista) ||
    puede(rol, PERMISOS.listaPrecios.acciones.importarLista)
  );
}

export async function getProveedores() {
  const rol = await getRol();
  if (!puedeConsultarCatalogoProveedores(rol)) return [];
  return proveedorService.getProveedores();
}

/**
 * Lista únicamente los proveedores con `proveedor_mercaderia = true`.
 * Usada por /gestion-productos/proveedores/lista (tabla "Lista Proveedores").
 */
export async function getProveedoresMercaderia() {
  const rol = await getRol();
  if (!puedeConsultarCatalogoProveedores(rol)) return [];
  return proveedorService.getProveedoresMercaderia();
}

/**
 * Datos para `/proveedores`: proveedores + productos filtrados desde `prod_precios_provee`.
 * Sin filtros activos no se cargan productos (misma regla que lista-precios).
 */
export async function getProveedoresPageData(raw: unknown): Promise<{
  proveedores: Awaited<ReturnType<typeof proveedorService.getProveedoresMercaderia>>;
  productos: ProductoProveedoresPage[];
  total: number;
  totalPaginas: number;
}> {
  const vacio = { proveedores: [] as Awaited<ReturnType<typeof proveedorService.getProveedoresMercaderia>>, productos: [], total: 0, totalPaginas: 0 };
  const rol = await getRol();
  if (!puedeConsultarCatalogoProveedores(rol)) return vacio;

  const parsed = proveedoresPageParamsSchema.safeParse(raw);
  const params = parsed.success ? parsed.data : {};
  const proveedores = await proveedorService.getProveedoresMercaderia();

  const sinFiltros = !params.q?.trim() && !params.proveedor;
  if (sinFiltros) {
    return { proveedores, productos: [], total: 0, totalPaginas: 0 };
  }

  try {
    const { productos, total, totalPaginas } = await getProductosProveedoresPageFiltrados({
      proveedorId: params.proveedor,
      busqueda: params.q?.trim() || undefined,
      pagina: params.pagina,
    });
    return { proveedores, productos, total, totalPaginas };
  } catch {
    return { proveedores, productos: [], total: 0, totalPaginas: 0 };
  }
}

export async function crearProveedor(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.proveedores.acciones.nuevoProveedor)) {
    return { ok: false, error: "Sin permisos para crear proveedores." };
  }

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
    whatsapp: (formData.get("whatsapp") as string) ?? "",
    coeficienteTintometrico:
      (formData.get("coeficienteTintometrico") as string) ?? "",
    plazosPagos: (formData.get("plazosPagos") as string) ?? "",
    tiempoEntregaEnDias:
      (formData.get("tiempoEntregaEnDias") as string) ?? "",
    proveedorMercaderia:
      (formData.get("proveedorMercaderia") as string | null) ?? "",
    iva: (formData.get("iva") as string | null) ?? "",
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
      first.tiempoEntregaEnDias?.[0] ??
      first.iva?.[0] ??
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

export async function editarProveedor(id: string, formData: FormData): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.proveedores.acciones.nuevoProveedor)) {
    return { ok: false, error: "Sin permisos para editar proveedores." };
  }
  const idParsed = prismaCuidSchema.safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID de proveedor inválido." };

  const raw = {
    nombre: (formData.get("nombre") as string) ?? "",
    prefijo: (formData.get("prefijo") as string) ?? "",
    whatsapp: (formData.get("whatsapp") as string) ?? "",
    coeficienteTintometrico:
      (formData.get("coeficienteTintometrico") as string) ?? "",
    plazosPagos: (formData.get("plazosPagos") as string) ?? "",
    tiempoEntregaEnDias:
      (formData.get("tiempoEntregaEnDias") as string) ?? "",
    proveedorMercaderia:
      (formData.get("proveedorMercaderia") as string | null) ?? "",
    iva: (formData.get("iva") as string | null) ?? "",
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
      first.tiempoEntregaEnDias?.[0] ??
      first.iva?.[0] ??
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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.proveedores.acciones.nuevoProveedor)) {
    return { ok: false, error: "Sin permisos para eliminar proveedores." };
  }
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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso) || !(await esEditor())) {
    return { ok: false, error: "Sin permisos para editar coeficientes tintométricos." };
  }

  const parsed = coeficienteBulkSchema.safeParse(raw);
  if (!parsed.success) {
    const first =
      [...Object.values(parsed.error.flatten().fieldErrors).flat(), ...parsed.error.flatten().formErrors][0] ??
      "Datos inválidos.";
    return { ok: false, error: first };
  }

  try {
    await proveedorService.updateCoeficientesTintometricos(parsed.data);
    revalidatePath("/stock");
    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista");
    revalidatePath("/proveedores/gestion");
    revalidatePath("/tienda/tintometrico");
    revalidatePath("/tienda/litros");
    return { ok: true, data: { actualizados: parsed.data.length } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al actualizar coeficientes.";
    return { ok: false, error: message };
  }
}
