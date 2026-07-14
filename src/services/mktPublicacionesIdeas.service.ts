import { prisma } from "@/lib/prisma";
import type { MktIdeaDetalleItem, MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";
import type {
  CrearMktIdeaDetalleInput,
  CrearMktIdeaSeccionInput,
  EditarMktIdeaDetalleInput,
  EditarMktIdeaSeccionInput,
} from "@/lib/validations/mktPublicacionesIdeas";
import type { ServiceResult } from "@/types/service.types";

function normalizarNombre(nombre: string): string {
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
      return `No se puede eliminar: hay datos relacionados con ${etiqueta}.`;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

const detalleSelect = {
  id: true,
  seccionId: true,
  detalle: true,
  redId: true,
  tipoPublicacionId: true,
  tipoContenidoId: true,
  usada: true,
  red: { select: { redSocialNombre: true } },
  tipoPublicacion: { select: { tipoPublicacionNombre: true } },
  tipoContenido: { select: { contenidoNombre: true } },
} as const;

function mapDetalle(row: {
  id: string;
  seccionId: string;
  detalle: string;
  redId: string;
  tipoPublicacionId: string;
  tipoContenidoId: string;
  usada: boolean;
  red: { redSocialNombre: string };
  tipoPublicacion: { tipoPublicacionNombre: string };
  tipoContenido: { contenidoNombre: string };
}): MktIdeaDetalleItem {
  return {
    id: row.id,
    seccionId: row.seccionId,
    detalle: row.detalle,
    redId: row.redId,
    redNombre: row.red.redSocialNombre.toLocaleUpperCase("es-AR"),
    tipoPublicacionId: row.tipoPublicacionId,
    tipoPublicacionNombre: row.tipoPublicacion.tipoPublicacionNombre.toLocaleUpperCase("es-AR"),
    tipoContenidoId: row.tipoContenidoId,
    tipoContenidoNombre: row.tipoContenido.contenidoNombre.toLocaleUpperCase("es-AR"),
    usada: row.usada,
  };
}

async function assertCatalogosExisten(input: {
  redId: string;
  tipoPublicacionId: string;
  tipoContenidoId: string;
}): Promise<ServiceResult<true>> {
  const [red, tipo, contenido] = await Promise.all([
    prisma.mktPublicacionRed.findUnique({ where: { id: input.redId }, select: { id: true } }),
    prisma.mktPublicacionTipo.findUnique({
      where: { id: input.tipoPublicacionId },
      select: { id: true },
    }),
    prisma.mktPublicacionContenidoTipo.findUnique({
      where: { id: input.tipoContenidoId },
      select: { id: true },
    }),
  ]);
  if (!red) return { success: false, error: "La red seleccionada no existe." };
  if (!tipo) return { success: false, error: "El tipo de publicación no existe." };
  if (!contenido) return { success: false, error: "El tipo de contenido no existe." };
  return { success: true, data: true };
}

export async function listarMktIdeasJerarquia(): Promise<MktIdeaSeccionItem[]> {
  const rows = await prisma.mktPublicacionIdeaSeccion.findMany({
    orderBy: { ideaNombre: "asc" },
    select: {
      id: true,
      ideaNombre: true,
      detalles: {
        orderBy: { createdAt: "asc" },
        select: detalleSelect,
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    nombre: s.ideaNombre.toLocaleUpperCase("es-AR"),
    detalles: s.detalles.map(mapDetalle),
  }));
}

export async function crearMktIdeaSeccion(
  input: CrearMktIdeaSeccionInput
): Promise<ServiceResult<MktIdeaSeccionItem>> {
  const nombre = normalizarNombre(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const created = await prisma.mktPublicacionIdeaSeccion.create({
      data: { ideaNombre: nombre },
      select: { id: true, ideaNombre: true },
    });
    return {
      success: true,
      data: { id: created.id, nombre: created.ideaNombre, detalles: [] },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la sección.", "una sección"),
    };
  }
}

export async function editarMktIdeaSeccion(
  input: EditarMktIdeaSeccionInput
): Promise<ServiceResult<MktIdeaSeccionItem>> {
  const nombre = normalizarNombre(input.nombre);
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const updated = await prisma.mktPublicacionIdeaSeccion.update({
      where: { id: input.id },
      data: { ideaNombre: nombre },
      select: {
        id: true,
        ideaNombre: true,
        detalles: {
          orderBy: { createdAt: "asc" },
          select: detalleSelect,
        },
      },
    });
    return {
      success: true,
      data: {
        id: updated.id,
        nombre: updated.ideaNombre,
        detalles: updated.detalles.map(mapDetalle),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar la sección.", "una sección"),
    };
  }
}

export async function eliminarMktIdeaSeccion(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktPublicacionIdeaSeccion.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar la sección.", "una sección"),
    };
  }
}

export async function crearMktIdeaDetalle(
  input: CrearMktIdeaDetalleInput
): Promise<ServiceResult<MktIdeaDetalleItem>> {
  const detalle = input.detalle.trim();
  if (!detalle) {
    return { success: false, error: "El detalle no puede quedar vacío." };
  }
  const cats = await assertCatalogosExisten(input);
  if (!cats.success) return cats;

  try {
    const seccion = await prisma.mktPublicacionIdeaSeccion.findUnique({
      where: { id: input.seccionId },
      select: { id: true },
    });
    if (!seccion) {
      return { success: false, error: "La sección no existe." };
    }
    const created = await prisma.mktPublicacionIdeaDetalle.create({
      data: {
        seccionId: input.seccionId,
        detalle,
        redId: input.redId,
        tipoPublicacionId: input.tipoPublicacionId,
        tipoContenidoId: input.tipoContenidoId,
        usada: false,
      },
      select: detalleSelect,
    });
    return { success: true, data: mapDetalle(created) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el detalle.", "un detalle"),
    };
  }
}

export async function editarMktIdeaDetalle(
  input: EditarMktIdeaDetalleInput
): Promise<ServiceResult<MktIdeaDetalleItem>> {
  const detalle = input.detalle.trim();
  if (!detalle) {
    return { success: false, error: "El detalle no puede quedar vacío." };
  }
  const cats = await assertCatalogosExisten(input);
  if (!cats.success) return cats;

  try {
    const updated = await prisma.mktPublicacionIdeaDetalle.update({
      where: { id: input.id },
      data: {
        detalle,
        redId: input.redId,
        tipoPublicacionId: input.tipoPublicacionId,
        tipoContenidoId: input.tipoContenidoId,
        usada: input.usada,
      },
      select: detalleSelect,
    });
    return { success: true, data: mapDetalle(updated) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar el detalle.", "un detalle"),
    };
  }
}

export async function eliminarMktIdeaDetalle(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktPublicacionIdeaDetalle.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar el detalle.", "un detalle"),
    };
  }
}
