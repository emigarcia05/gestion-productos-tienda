import { prisma } from "@/lib/prisma";
import type {
  MktCatalogoNombreItem,
  MktPublicacionTipoItem,
} from "@/lib/mktPublicacionesCatalogo";
import type {
  CrearMktCatalogoNombreInput,
  CrearMktPublicacionTipoInput,
  EditarMktCatalogoNombreInput,
  EditarMktPublicacionTipoInput,
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
    if (code === "P2003") {
      return `No se puede eliminar: hay publicaciones que usan ${etiqueta}.`;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

async function assertContenidosExisten(ids: string[]): Promise<ServiceResult<true>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { success: true, data: true };
  const count = await prisma.mktPublicacionContenidoTipo.count({
    where: { id: { in: unique } },
  });
  if (count !== unique.length) {
    return { success: false, error: "Hay tipos de contenido inválidos o inexistentes." };
  }
  return { success: true, data: true };
}

function mapTipoRow(row: {
  id: string;
  tipoPublicacionNombre: string;
  contenidosPermitidos: { contenidoTipoId: string }[];
}): MktPublicacionTipoItem {
  return {
    id: row.id,
    nombre: row.tipoPublicacionNombre.toLocaleUpperCase("es-AR"),
    contenidoIdsPermitidos: row.contenidosPermitidos.map((l) => l.contenidoTipoId),
  };
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

// ─── Tipos de contenido (catálogo global) ────────────────────────────────────

export async function listarMktPublicacionContenidos(): Promise<MktCatalogoNombreItem[]> {
  const rows = await prisma.mktPublicacionContenidoTipo.findMany({
    orderBy: { contenidoNombre: "asc" },
    select: { id: true, contenidoNombre: true },
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.contenidoNombre.toLocaleUpperCase("es-AR"),
  }));
}

export async function crearMktPublicacionContenido(
  input: CrearMktCatalogoNombreInput
): Promise<ServiceResult<MktCatalogoNombreItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const created = await prisma.mktPublicacionContenidoTipo.create({
      data: { contenidoNombre: nombre },
      select: { id: true, contenidoNombre: true },
    });
    return {
      success: true,
      data: { id: created.id, nombre: created.contenidoNombre },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el tipo de contenido.", "un tipo de contenido"),
    };
  }
}

export async function editarMktPublicacionContenido(
  input: EditarMktCatalogoNombreInput
): Promise<ServiceResult<MktCatalogoNombreItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const updated = await prisma.mktPublicacionContenidoTipo.update({
      where: { id: input.id },
      data: { contenidoNombre: nombre },
      select: { id: true, contenidoNombre: true },
    });
    return {
      success: true,
      data: { id: updated.id, nombre: updated.contenidoNombre },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar el tipo de contenido.", "un tipo de contenido"),
    };
  }
}

export async function eliminarMktPublicacionContenido(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktPublicacionContenidoTipo.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar el tipo de contenido.", "un tipo de contenido"),
    };
  }
}

// ─── Tipos de publicación ────────────────────────────────────────────────────

export async function listarMktPublicacionTipos(): Promise<MktPublicacionTipoItem[]> {
  const rows = await prisma.mktPublicacionTipo.findMany({
    orderBy: { tipoPublicacionNombre: "asc" },
    select: {
      id: true,
      tipoPublicacionNombre: true,
      contenidosPermitidos: { select: { contenidoTipoId: true } },
    },
  });
  return rows.map(mapTipoRow);
}

export async function crearMktPublicacionTipo(
  input: CrearMktPublicacionTipoInput
): Promise<ServiceResult<MktPublicacionTipoItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  const ids = [...new Set(input.contenidoIdsPermitidos)];
  const check = await assertContenidosExisten(ids);
  if (!check.success) return check;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const tipo = await tx.mktPublicacionTipo.create({
        data: {
          tipoPublicacionNombre: nombre,
          contenidosPermitidos: {
            create: ids.map((contenidoTipoId) => ({ contenidoTipoId })),
          },
        },
        select: {
          id: true,
          tipoPublicacionNombre: true,
          contenidosPermitidos: { select: { contenidoTipoId: true } },
        },
      });
      return tipo;
    });
    return { success: true, data: mapTipoRow(created) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el tipo.", "un tipo"),
    };
  }
}

export async function editarMktPublicacionTipo(
  input: EditarMktPublicacionTipoInput
): Promise<ServiceResult<MktPublicacionTipoItem>> {
  const nombre = normalizarNombreCatalogo(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  const ids = [...new Set(input.contenidoIdsPermitidos)];
  const check = await assertContenidosExisten(ids);
  if (!check.success) return check;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.mktPublicacionTipoContenido.deleteMany({
        where: { tipoPublicacionId: input.id },
      });
      const tipo = await tx.mktPublicacionTipo.update({
        where: { id: input.id },
        data: {
          tipoPublicacionNombre: nombre,
          contenidosPermitidos: {
            create: ids.map((contenidoTipoId) => ({ contenidoTipoId })),
          },
        },
        select: {
          id: true,
          tipoPublicacionNombre: true,
          contenidosPermitidos: { select: { contenidoTipoId: true } },
        },
      });
      return tipo;
    });
    return { success: true, data: mapTipoRow(updated) };
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
