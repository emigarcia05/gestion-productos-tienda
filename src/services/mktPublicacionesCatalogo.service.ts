import { prisma } from "@/lib/prisma";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type {
  CrearMktCatalogoNombreInput,
  EditarMktCatalogoNombreInput,
} from "@/lib/validations/mktPublicacionesCatalogo";
import type { ServiceResult } from "@/types/service.types";

function normalizarNombreCatalogo(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

function mapDbError(error: unknown, fallback: string, etiqueta: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") return `Ya existe ${etiqueta} con ese nombre.`;
    if (code === "P2025") return `${etiqueta.charAt(0).toUpperCase()}${etiqueta.slice(1)} no encontrado/a.`;
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Redes ───────────────────────────────────────────────────────────────────

export async function listarMktPublicacionRedes(): Promise<MktCatalogoNombreItem[]> {
  const rows = await prisma.mktPublicacionRed.findMany({
    orderBy: { redSocialNombre: "asc" },
    select: { id: true, redSocialNombre: true },
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.redSocialNombre.toLocaleUpperCase("es-AR"),
  }));
}

export async function crearMktPublicacionRed(
  input: CrearMktCatalogoNombreInput
): Promise<ServiceResult<MktCatalogoNombreItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const created = await prisma.mktPublicacionRed.create({
      data: { redSocialNombre: nombre },
      select: { id: true, redSocialNombre: true },
    });
    return {
      success: true,
      data: { id: created.id, nombre: created.redSocialNombre },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la red.", "una red"),
    };
  }
}

export async function editarMktPublicacionRed(
  input: EditarMktCatalogoNombreInput
): Promise<ServiceResult<MktCatalogoNombreItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const updated = await prisma.mktPublicacionRed.update({
      where: { id: input.id },
      data: { redSocialNombre: nombre },
      select: { id: true, redSocialNombre: true },
    });
    return {
      success: true,
      data: { id: updated.id, nombre: updated.redSocialNombre },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar la red.", "una red"),
    };
  }
}

export async function eliminarMktPublicacionRed(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktPublicacionRed.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar la red.", "una red"),
    };
  }
}

// ─── Tipos de publicación ────────────────────────────────────────────────────

export async function listarMktPublicacionTipos(): Promise<MktCatalogoNombreItem[]> {
  const rows = await prisma.mktPublicacionTipo.findMany({
    orderBy: { tipoPublicacionNombre: "asc" },
    select: { id: true, tipoPublicacionNombre: true },
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.tipoPublicacionNombre.toLocaleUpperCase("es-AR"),
  }));
}

export async function crearMktPublicacionTipo(
  input: CrearMktCatalogoNombreInput
): Promise<ServiceResult<MktCatalogoNombreItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const created = await prisma.mktPublicacionTipo.create({
      data: { tipoPublicacionNombre: nombre },
      select: { id: true, tipoPublicacionNombre: true },
    });
    return {
      success: true,
      data: { id: created.id, nombre: created.tipoPublicacionNombre },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el tipo.", "un tipo"),
    };
  }
}

export async function editarMktPublicacionTipo(
  input: EditarMktCatalogoNombreInput
): Promise<ServiceResult<MktCatalogoNombreItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const updated = await prisma.mktPublicacionTipo.update({
      where: { id: input.id },
      data: { tipoPublicacionNombre: nombre },
      select: { id: true, tipoPublicacionNombre: true },
    });
    return {
      success: true,
      data: { id: updated.id, nombre: updated.tipoPublicacionNombre },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar el tipo.", "un tipo"),
    };
  }
}

export async function eliminarMktPublicacionTipo(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktPublicacionTipo.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar el tipo.", "un tipo"),
    };
  }
}
