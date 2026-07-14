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
  tipoContenidoId: true,
  usada: true,
  tipoContenido: { select: { contenidoNombre: true } },
  redes: {
    select: {
      redId: true,
      red: { select: { redSocialNombre: true } },
    },
  },
  tipos: {
    select: {
      tipoPublicacionId: true,
      tipoPublicacion: { select: { tipoPublicacionNombre: true } },
    },
  },
} as const;

/** DETALLE: primero `usada = false`, luego `titulo_idea` A–Z (es). */
function ordenarDetallesIdeas(items: MktIdeaDetalleItem[]): MktIdeaDetalleItem[] {
  return [...items].sort((a, b) => {
    if (a.usada !== b.usada) return a.usada ? 1 : -1;
    return a.tituloIdea.localeCompare(b.tituloIdea, "es", { sensitivity: "base" });
  });
}

const detallesOrderBy = [{ usada: "asc" as const }, { tituloIdea: "asc" as const }];

function mapDetalle(row: {
  id: string;
  seccionId: string;
  tituloIdea: string;
  detalle: string;
  tipoContenidoId: string;
  usada: boolean;
  tipoContenido: { contenidoNombre: string };
  redes: { redId: string; red: { redSocialNombre: string } }[];
  tipos: { tipoPublicacionId: string; tipoPublicacion: { tipoPublicacionNombre: string } }[];
}): MktIdeaDetalleItem {
  const redesSorted = [...row.redes].sort((a, b) =>
    a.red.redSocialNombre.localeCompare(b.red.redSocialNombre, "es")
  );
  const tiposSorted = [...row.tipos].sort((a, b) =>
    a.tipoPublicacion.tipoPublicacionNombre.localeCompare(
      b.tipoPublicacion.tipoPublicacionNombre,
      "es"
    )
  );
  return {
    id: row.id,
    seccionId: row.seccionId,
    tituloIdea: row.tituloIdea.trim().toLocaleUpperCase("es-AR"),
    detalle: row.detalle,
    redIds: redesSorted.map((r) => r.redId),
    redesNombres: redesSorted.map((r) => r.red.redSocialNombre.toLocaleUpperCase("es-AR")),
    tipoPublicacionIds: tiposSorted.map((t) => t.tipoPublicacionId),
    tiposPublicacionNombres: tiposSorted.map((t) =>
      t.tipoPublicacion.tipoPublicacionNombre.toLocaleUpperCase("es-AR")
    ),
    tipoContenidoId: row.tipoContenidoId,
    tipoContenidoNombre: row.tipoContenido.contenidoNombre.toLocaleUpperCase("es-AR"),
    usada: row.usada,
  };
}

async function assertCatalogosExisten(input: {
  redIds: string[];
  tipoPublicacionIds: string[];
  tipoContenidoId: string;
}): Promise<ServiceResult<true>> {
  const redIds = [...new Set(input.redIds)];
  const tipoIds = [...new Set(input.tipoPublicacionIds)];
  const [redCount, tipoCount, contenido] = await Promise.all([
    prisma.mktPublicacionRed.count({ where: { id: { in: redIds } } }),
    prisma.mktPublicacionTipo.count({ where: { id: { in: tipoIds } } }),
    prisma.mktPublicacionContenidoTipo.findUnique({
      where: { id: input.tipoContenidoId },
      select: { id: true },
    }),
  ]);
  if (redCount !== redIds.length) {
    return { success: false, error: "Hay redes inválidas o inexistentes." };
  }
  if (tipoCount !== tipoIds.length) {
    return { success: false, error: "Hay tipos de publicación inválidos o inexistentes." };
  }
  if (!contenido) return { success: false, error: "El tipo de contenido no existe." };
  return { success: true, data: true };
}

export async function listarMktIdeasJerarquia(): Promise<MktIdeaSeccionItem[]> {
  const rows = await prisma.mktPublicacionIdeaSeccion.findMany({
    orderBy: { ideaNombre: "asc" },
    select: {
      id: true,
      ideaNombre: true,
      ideaResumen: true,
      detalles: {
        orderBy: detallesOrderBy,
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
        nombre: created.ideaNombre,
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
          orderBy: detallesOrderBy,
          select: detalleSelect,
        },
      },
    });
    return {
      success: true,
      data: {
        id: updated.id,
        nombre: updated.ideaNombre,
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
  if (!detalle) {
    return { success: false, error: "El detalle no puede quedar vacío." };
  }
  const redIds = [...new Set(input.redIds)];
  const tipoPublicacionIds = [...new Set(input.tipoPublicacionIds)];
  const cats = await assertCatalogosExisten({
    redIds,
    tipoPublicacionIds,
    tipoContenidoId: input.tipoContenidoId,
  });
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
        tituloIdea,
        detalle,
        tipoContenidoId: input.tipoContenidoId,
        usada: false,
        redes: { create: redIds.map((redId) => ({ redId })) },
        tipos: {
          create: tipoPublicacionIds.map((tipoPublicacionId) => ({ tipoPublicacionId })),
        },
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
  if (!detalle) {
    return { success: false, error: "El detalle no puede quedar vacío." };
  }
  const redIds = [...new Set(input.redIds)];
  const tipoPublicacionIds = [...new Set(input.tipoPublicacionIds)];
  const cats = await assertCatalogosExisten({
    redIds,
    tipoPublicacionIds,
    tipoContenidoId: input.tipoContenidoId,
  });
  if (!cats.success) return cats;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.mktPublicacionIdeaDetalleRed.deleteMany({
        where: { ideaDetalleId: input.id },
      });
      await tx.mktPublicacionIdeaDetalleTipo.deleteMany({
        where: { ideaDetalleId: input.id },
      });
      return tx.mktPublicacionIdeaDetalle.update({
        where: { id: input.id },
        data: {
          tituloIdea,
          detalle,
          tipoContenidoId: input.tipoContenidoId,
          usada: input.usada,
          redes: { create: redIds.map((redId) => ({ redId })) },
          tipos: {
            create: tipoPublicacionIds.map((tipoPublicacionId) => ({ tipoPublicacionId })),
          },
        },
        select: detalleSelect,
      });
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
