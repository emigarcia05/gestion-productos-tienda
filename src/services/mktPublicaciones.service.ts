import { prisma } from "@/lib/prisma";
import { isoYmdFromPrismaDateOnly } from "@/lib/fechaArgentina";
import {
  mktContenidoCreadoDesdeUrl,
  type MktPublicacionCalendarioItem,
} from "@/lib/mktPublicaciones";
import type {
  CrearMktPublicacionInput,
  EditarMktPublicacionInput,
} from "@/lib/validations/mktPublicaciones";
import type { ServiceResult } from "@/types/service.types";

const publicacionSelect = {
  id: true,
  fecha: true,
  publicacion: true,
  contenidoUrl: true,
  contenidoCreado: true,
  redId: true,
  tipoContenidoId: true,
  ideaDetalleId: true,
  ideaDetalle: { select: { seccionId: true } },
  red: { select: { redSocialNombre: true } },
  tipoContenido: { select: { contenidoNombre: true } },
} as const;

function mapPublicacion(row: {
  id: string;
  fecha: Date;
  publicacion: string;
  contenidoUrl: string;
  contenidoCreado: boolean;
  redId: string;
  tipoContenidoId: string;
  ideaDetalleId: string | null;
  ideaDetalle: { seccionId: string } | null;
  red: { redSocialNombre: string };
  tipoContenido: { contenidoNombre: string };
}): MktPublicacionCalendarioItem {
  const contenidoUrl = row.contenidoUrl.trim();
  return {
    id: row.id,
    fechaIso: isoYmdFromPrismaDateOnly(row.fecha),
    publicacion: row.publicacion.trim(),
    contenidoUrl,
    contenidoCreado: mktContenidoCreadoDesdeUrl(contenidoUrl),
    redId: row.redId,
    redNombre: row.red.redSocialNombre.toLocaleUpperCase("es-AR"),
    tipoContenidoId: row.tipoContenidoId,
    tipoContenidoNombre: row.tipoContenido.contenidoNombre.toLocaleUpperCase("es-AR"),
    ideaDetalleId: row.ideaDetalleId,
    ideaSeccionId: row.ideaDetalle?.seccionId ?? null,
  };
}

function dateFromIsoYmd(isoYmd: string): Date {
  return new Date(`${isoYmd}T12:00:00.000Z`);
}

function persistContenido(contenidoUrl: string): {
  contenidoUrl: string;
  contenidoCreado: boolean;
} {
  const url = contenidoUrl.trim();
  return {
    contenidoUrl: url,
    contenidoCreado: mktContenidoCreadoDesdeUrl(url),
  };
}

async function assertCatalogos(input: {
  redId: string;
  tipoContenidoId: string;
}): Promise<ServiceResult<true>> {
  const [red, contenido] = await Promise.all([
    prisma.mktPublicacionRed.findUnique({
      where: { id: input.redId },
      select: { id: true },
    }),
    prisma.mktPublicacionContenidoTipo.findUnique({
      where: { id: input.tipoContenidoId },
      select: { id: true },
    }),
  ]);
  if (!red) return { success: false, error: "La red no existe." };
  if (!contenido) return { success: false, error: "El tipo de contenido no existe." };
  return { success: true, data: true };
}

/**
 * Valida idea disponible para programar y devuelve su `detalle` (texto de publicación).
 * `permitirIdeaId` = idea ya vinculada a la publicación en edición.
 */
async function assertIdeaDetalleDisponible(
  ideaDetalleId: string,
  permitirIdeaId?: string | null
): Promise<ServiceResult<{ detalle: string }>> {
  const idea = await prisma.mktPublicacionIdeaDetalle.findUnique({
    where: { id: ideaDetalleId },
    select: {
      id: true,
      detalle: true,
      usada: true,
      publicacion: { select: { id: true } },
    },
  });
  if (!idea) return { success: false, error: "La idea seleccionada no existe." };
  const detalle = idea.detalle.trim();
  if (!detalle) {
    return { success: false, error: "La idea no tiene detalle para publicar." };
  }
  if (permitirIdeaId && idea.id === permitirIdeaId) {
    return { success: true, data: { detalle } };
  }
  if (idea.usada || idea.publicacion) {
    return {
      success: false,
      error: "La idea ya está programada o marcada como usada.",
    };
  }
  return { success: true, data: { detalle } };
}

export async function listarMktPublicacionesCalendario(): Promise<
  MktPublicacionCalendarioItem[]
> {
  const rows = await prisma.mktPublicacion.findMany({
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    select: publicacionSelect,
  });
  return rows.map(mapPublicacion);
}

export async function crearMktPublicacion(
  input: CrearMktPublicacionInput
): Promise<ServiceResult<MktPublicacionCalendarioItem>> {
  const cats = await assertCatalogos(input);
  if (!cats.success) return cats;

  const ideaOk = await assertIdeaDetalleDisponible(input.ideaDetalleId);
  if (!ideaOk.success) return ideaOk;
  const publicacion = ideaOk.data.detalle;
  const contenido = persistContenido(input.contenidoUrl);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.mktPublicacion.create({
        data: {
          fecha: dateFromIsoYmd(input.fechaIso),
          publicacion,
          contenidoUrl: contenido.contenidoUrl,
          contenidoCreado: contenido.contenidoCreado,
          redId: input.redId,
          tipoContenidoId: input.tipoContenidoId,
          ideaDetalleId: input.ideaDetalleId,
        },
        select: publicacionSelect,
      });
      await tx.mktPublicacionIdeaDetalle.update({
        where: { id: input.ideaDetalleId },
        data: { usada: true },
      });
      return row;
    });
    return { success: true, data: mapPublicacion(created) };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { success: false, error: "La idea ya está vinculada a otra publicación." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo crear la publicación.",
    };
  }
}

export async function editarMktPublicacion(
  input: EditarMktPublicacionInput
): Promise<ServiceResult<MktPublicacionCalendarioItem>> {
  const cats = await assertCatalogos(input);
  if (!cats.success) return cats;

  const actual = await prisma.mktPublicacion.findUnique({
    where: { id: input.id },
    select: { id: true, ideaDetalleId: true },
  });
  if (!actual) return { success: false, error: "La publicación no existe." };

  const ideaOk = await assertIdeaDetalleDisponible(
    input.ideaDetalleId,
    actual.ideaDetalleId
  );
  if (!ideaOk.success) return ideaOk;
  const publicacion = ideaOk.data.detalle;
  const contenido = persistContenido(input.contenidoUrl);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const ideaAnteriorId = actual.ideaDetalleId;
      const ideaNuevaId = input.ideaDetalleId;

      if (ideaAnteriorId && ideaAnteriorId !== ideaNuevaId) {
        await tx.mktPublicacionIdeaDetalle.update({
          where: { id: ideaAnteriorId },
          data: { usada: false },
        });
      }

      const row = await tx.mktPublicacion.update({
        where: { id: input.id },
        data: {
          fecha: dateFromIsoYmd(input.fechaIso),
          publicacion,
          contenidoUrl: contenido.contenidoUrl,
          contenidoCreado: contenido.contenidoCreado,
          redId: input.redId,
          tipoContenidoId: input.tipoContenidoId,
          ideaDetalleId: ideaNuevaId,
        },
        select: publicacionSelect,
      });

      await tx.mktPublicacionIdeaDetalle.update({
        where: { id: ideaNuevaId },
        data: { usada: true },
      });

      return row;
    });
    return { success: true, data: mapPublicacion(updated) };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return { success: false, error: "La publicación no existe." };
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { success: false, error: "La idea ya está vinculada a otra publicación." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo actualizar la publicación.",
    };
  }
}

export async function eliminarMktPublicacion(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.$transaction(async (tx) => {
      const actual = await tx.mktPublicacion.findUnique({
        where: { id },
        select: { id: true, ideaDetalleId: true },
      });
      if (!actual) {
        throw Object.assign(new Error("La publicación no existe."), { code: "P2025" });
      }
      await tx.mktPublicacion.delete({ where: { id } });
      if (actual.ideaDetalleId) {
        await tx.mktPublicacionIdeaDetalle.update({
          where: { id: actual.ideaDetalleId },
          data: { usada: false },
        });
      }
    });
    return { success: true, data: { id } };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return { success: false, error: "La publicación no existe." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo eliminar la publicación.",
    };
  }
}
