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
  tituloIdea: true,
  detalle: true,
  publicacion: { select: { id: true } },
  redes: {
    select: {
      redId: true,
      red: { select: { redSocialNombre: true } },
    },
  },
} as const;

/** DETALLE: primero libres (sin publicación), luego `titulo_idea` A–Z (es). */
function ordenarDetallesIdeas(items: MktIdeaDetalleItem[]): MktIdeaDetalleItem[] {
  return [...items].sort((a, b) => {
    if (a.usada !== b.usada) return a.usada ? 1 : -1;
    return a.tituloIdea.localeCompare(b.tituloIdea, "es", { sensitivity: "base" });
  });
}

function mapDetalle(row: {
  id: string;
  seccionId: string;
  tituloIdea: string;
  detalle: string;
  publicacion: { id: string } | null;
  redes: { redId: string; red: { redSocialNombre: string } }[];
}): MktIdeaDetalleItem {
  const redesSorted = [...row.redes].sort((a, b) =>
    a.red.redSocialNombre.localeCompare(b.red.redSocialNombre, "es")
  );
  return {
    id: row.id,
    seccionId: row.seccionId,
    tituloIdea: row.tituloIdea.trim().toLocaleUpperCase("es-AR"),
    detalle: row.detalle,
    redIds: redesSorted.map((r) => r.redId),
    redesNombres: redesSorted.map((r) => r.red.redSocialNombre.toLocaleUpperCase("es-AR")),
    usada: Boolean(row.publicacion),
  };
}

export async function listarMktIdeasJerarquia(): Promise<MktIdeaSeccionItem[]> {
  const rows = await prisma.mktPublicacionIdeaSeccion.findMany({
    orderBy: { ideaNombre: "asc" },
    select: {
      id: true,
      ideaNombre: true,
      ideaResumen: true,
      detalles: {
        orderBy: { tituloIdea: "asc" },
        select: detalleSelect,
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    nombre: s.ideaNombre.toLocaleUpperCase("es-AR"),
    resumen: s.ideaResumen.trim(),
    detalles: ordenarDetallesIdeas(s.detalles.map(mapDetalle)),
  }));
}

export async function listarMktIdeaSecciones(): Promise<
  Omit<MktIdeaSeccionItem, "detalles">[]
> {
  const jerarquia = await listarMktIdeasJerarquia();
  return jerarquia.map(({ id, nombre, resumen }) => ({ id, nombre, resumen }));
}

export async function listarMktIdeaDetalles(): Promise<MktIdeaDetalleItem[]> {
  const rows = await prisma.mktPublicacionIdeaDetalle.findMany({
    orderBy: { tituloIdea: "asc" },
    select: detalleSelect,
  });
  return ordenarDetallesIdeas(rows.map(mapDetalle));
}

export async function crearMktIdeaSeccion(
  input: CrearMktIdeaSeccionInput
): Promise<ServiceResult<MktIdeaSeccionItem>> {
  const nombre = normalizarNombre(input.nombre);
  const resumen = input.resumen.trim();
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const created = await prisma.mktPublicacionIdeaSeccion.create({
      data: { ideaNombre: nombre, ideaResumen: resumen },
      select: { id: true, ideaNombre: true, ideaResumen: true },
    });
    return {
      success: true,
      data: {
        id: created.id,
        nombre: created.ideaNombre.toLocaleUpperCase("es-AR"),
        resumen: created.ideaResumen.trim(),
        detalles: [],
      },
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
  const resumen = input.resumen.trim();
  if (!nombre) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }
  try {
    const updated = await prisma.mktPublicacionIdeaSeccion.update({
      where: { id: input.id },
      data: { ideaNombre: nombre, ideaResumen: resumen },
      select: {
        id: true,
        ideaNombre: true,
        ideaResumen: true,
        detalles: {
          orderBy: { tituloIdea: "asc" },
          select: detalleSelect,
        },
      },
    });
    return {
      success: true,
      data: {
        id: updated.id,
        nombre: updated.ideaNombre.toLocaleUpperCase("es-AR"),
        resumen: updated.ideaResumen.trim(),
        detalles: ordenarDetallesIdeas(updated.detalles.map(mapDetalle)),
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
  const tituloIdea = input.tituloIdea.trim().toLocaleUpperCase("es-AR");
  const detalle = input.detalle.trim();
  if (!tituloIdea) {
    return { success: false, error: "El título no puede quedar vacío." };
  }

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
        tituloIdea,
        detalle,
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
  const tituloIdea = input.tituloIdea.trim().toLocaleUpperCase("es-AR");
  const detalle = input.detalle.trim();
  if (!tituloIdea) {
    return { success: false, error: "El título no puede quedar vacío." };
  }

  try {
    const updated = await prisma.mktPublicacionIdeaDetalle.update({
      where: { id: input.id },
      data: {
        tituloIdea,
        detalle,
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
