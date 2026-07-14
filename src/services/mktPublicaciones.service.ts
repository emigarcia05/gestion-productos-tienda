import { prisma } from "@/lib/prisma";
import { isoYmdFromPrismaDateOnly } from "@/lib/fechaArgentina";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import type { CrearMktPublicacionInput } from "@/lib/validations/mktPublicaciones";
import type { ServiceResult } from "@/types/service.types";

const publicacionSelect = {
  id: true,
  fecha: true,
  publicacion: true,
  contenidoCreado: true,
  redId: true,
  tipoPublicacionId: true,
  tipoContenidoId: true,
  red: { select: { redSocialNombre: true } },
  tipoPublicacion: { select: { tipoPublicacionNombre: true } },
  tipoContenido: { select: { contenidoNombre: true } },
} as const;

function mapPublicacion(row: {
  id: string;
  fecha: Date;
  publicacion: string;
  contenidoCreado: boolean;
  redId: string;
  tipoPublicacionId: string;
  tipoContenidoId: string;
  red: { redSocialNombre: string };
  tipoPublicacion: { tipoPublicacionNombre: string };
  tipoContenido: { contenidoNombre: string };
}): MktPublicacionCalendarioItem {
  return {
    id: row.id,
    fechaIso: isoYmdFromPrismaDateOnly(row.fecha),
    publicacion: row.publicacion.trim(),
    contenidoCreado: row.contenidoCreado,
    redId: row.redId,
    redNombre: row.red.redSocialNombre.toLocaleUpperCase("es-AR"),
    tipoPublicacionId: row.tipoPublicacionId,
    tipoPublicacionNombre: row.tipoPublicacion.tipoPublicacionNombre.toLocaleUpperCase("es-AR"),
    tipoContenidoId: row.tipoContenidoId,
    tipoContenidoNombre: row.tipoContenido.contenidoNombre.toLocaleUpperCase("es-AR"),
  };
}

function dateFromIsoYmd(isoYmd: string): Date {
  return new Date(`${isoYmd}T12:00:00.000Z`);
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
  const publicacion = input.publicacion.trim();
  if (!publicacion) {
    return { success: false, error: "El texto de la publicación no puede quedar vacío." };
  }

  const [red, tipo, contenido] = await Promise.all([
    prisma.mktPublicacionRed.findUnique({
      where: { id: input.redId },
      select: { id: true },
    }),
    prisma.mktPublicacionTipo.findUnique({
      where: { id: input.tipoPublicacionId },
      select: { id: true },
    }),
    prisma.mktPublicacionContenidoTipo.findUnique({
      where: { id: input.tipoContenidoId },
      select: { id: true },
    }),
  ]);

  if (!red) return { success: false, error: "La red no existe." };
  if (!tipo) return { success: false, error: "El tipo de publicación no existe." };
  if (!contenido) return { success: false, error: "El tipo de contenido no existe." };

  try {
    const created = await prisma.mktPublicacion.create({
      data: {
        fecha: dateFromIsoYmd(input.fechaIso),
        publicacion,
        contenidoCreado: input.contenidoCreado,
        redId: input.redId,
        tipoPublicacionId: input.tipoPublicacionId,
        tipoContenidoId: input.tipoContenidoId,
      },
      select: publicacionSelect,
    });
    return { success: true, data: mapPublicacion(created) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo crear la publicación.",
    };
  }
}
