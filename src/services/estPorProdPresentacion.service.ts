import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EstPorProdPresentacionItem } from "@/lib/estPorProdPresentacion";
import type {
  EstPorProdPosicionUnidad,
  EstPorProdUnPresentacionItem,
} from "@/lib/estPorProdUnPresentacion";
import { formatearPresentacionConUnidad } from "@/lib/estPorProdUnPresentacion";
import type {
  CrearEstPorProdPresentacionInput,
  EditarEstPorProdPresentacionInput,
} from "@/lib/validations/estPorProdPresentacion";
import type { ServiceResult } from "@/types";

const unidadSelect = {
  id: true,
  unidad: true,
  posicionUnidad: true,
  suma: true,
} as const;

const presentacionInclude = {
  unidadMedida: { select: unidadSelect },
  conversionAUnidad: { select: unidadSelect },
} as const;

function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapUnidad(r: {
  id: string;
  unidad: string;
  posicionUnidad: EstPorProdPosicionUnidad;
  suma: boolean;
}): EstPorProdUnPresentacionItem {
  return {
    id: r.id,
    unidad: r.unidad.toLocaleUpperCase("es-AR"),
    posicionUnidad: r.posicionUnidad,
    suma: r.suma,
  };
}

function mapRow(r: {
  id: string;
  texto: string;
  unidadMedidaId: string;
  presentacionNumerica: Prisma.Decimal;
  conversionAUnidadId: string;
  conversionAUnidadPresentacion: Prisma.Decimal;
  unidadMedida: {
    id: string;
    unidad: string;
    posicionUnidad: EstPorProdPosicionUnidad;
    suma: boolean;
  };
  conversionAUnidad: {
    id: string;
    unidad: string;
    posicionUnidad: EstPorProdPosicionUnidad;
    suma: boolean;
  };
}): EstPorProdPresentacionItem {
  return {
    id: r.id,
    texto: r.texto.toLocaleUpperCase("es-AR"),
    unidadMedidaId: r.unidadMedidaId,
    presentacionNumerica: toNumber(r.presentacionNumerica),
    conversionAUnidadId: r.conversionAUnidadId,
    conversionAUnidadPresentacion: toNumber(r.conversionAUnidadPresentacion),
    unidadMedida: mapUnidad(r.unidadMedida),
    conversionAUnidad: mapUnidad(r.conversionAUnidad),
  };
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") return "Ya existe una presentación con ese texto.";
    if (code === "P2025") return "Presentación no encontrada.";
    if (code === "P2003") return "Unidad de medida o conversión inválida.";
  }
  return error instanceof Error ? error.message : fallback;
}

async function unidadesExisten(
  unidadMedidaId: string,
  conversionAUnidadId: string
): Promise<boolean> {
  const count = await prisma.estPorProdUnPresentacion.count({
    where: { id: { in: [unidadMedidaId, conversionAUnidadId] } },
  });
  const ids = new Set([unidadMedidaId, conversionAUnidadId]);
  return count === ids.size;
}

/**
 * `texto` de match = presentación numérica + unidad de medida (prefijo/sufijo), en MAYÚSCULAS.
 * No lo envía el cliente; se recalcula en create/update.
 */
async function derivarTextoPresentacion(
  presentacionNumerica: number,
  unidadMedidaId: string
): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  const unidad = await prisma.estPorProdUnPresentacion.findUnique({
    where: { id: unidadMedidaId },
    select: { unidad: true, posicionUnidad: true },
  });
  if (!unidad) {
    return { ok: false, error: "Seleccioná una unidad de medida válida." };
  }
  const texto = normalizarTexto(
    formatearPresentacionConUnidad(presentacionNumerica, {
      unidad: unidad.unidad,
      posicionUnidad: unidad.posicionUnidad as EstPorProdPosicionUnidad,
    })
  );
  if (!texto) {
    return { ok: false, error: "No se pudo generar el texto de la presentación." };
  }
  return { ok: true, texto };
}

export async function listarEstPorProdPresentaciones(): Promise<
  EstPorProdPresentacionItem[]
> {
  try {
    const rows = await prisma.estPorProdPresentacion.findMany({
      orderBy: { texto: "asc" },
      include: presentacionInclude,
    });
    return rows.map(mapRow);
  } catch (e: unknown) {
    console.error(
      "[estPorProdPresentacion.service] listarEstPorProdPresentaciones:",
      e
    );
    return [];
  }
}

export async function crearEstPorProdPresentacion(
  input: CrearEstPorProdPresentacionInput
): Promise<ServiceResult<EstPorProdPresentacionItem>> {
  if (input.unidadMedidaId === input.conversionAUnidadId) {
    return {
      success: false,
      error: "Convertir a un. debe ser distinta de la unidad medida.",
    };
  }
  if (!(await unidadesExisten(input.unidadMedidaId, input.conversionAUnidadId))) {
    return { success: false, error: "Seleccioná unidades de presentación válidas." };
  }
  const derivado = await derivarTextoPresentacion(
    input.presentacionNumerica,
    input.unidadMedidaId
  );
  if (!derivado.ok) {
    return { success: false, error: derivado.error };
  }
  try {
    const created = await prisma.estPorProdPresentacion.create({
      data: {
        texto: derivado.texto,
        unidadMedidaId: input.unidadMedidaId,
        presentacionNumerica: new Prisma.Decimal(input.presentacionNumerica),
        conversionAUnidadId: input.conversionAUnidadId,
        conversionAUnidadPresentacion: new Prisma.Decimal(
          input.conversionAUnidadPresentacion
        ),
      },
      include: presentacionInclude,
    });
    return { success: true, data: mapRow(created) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la presentación."),
    };
  }
}

export async function editarEstPorProdPresentacion(
  input: EditarEstPorProdPresentacionInput
): Promise<ServiceResult<EstPorProdPresentacionItem>> {
  if (input.unidadMedidaId === input.conversionAUnidadId) {
    return {
      success: false,
      error: "Convertir a un. debe ser distinta de la unidad medida.",
    };
  }
  if (!(await unidadesExisten(input.unidadMedidaId, input.conversionAUnidadId))) {
    return { success: false, error: "Seleccioná unidades de presentación válidas." };
  }
  const derivado = await derivarTextoPresentacion(
    input.presentacionNumerica,
    input.unidadMedidaId
  );
  if (!derivado.ok) {
    return { success: false, error: derivado.error };
  }
  try {
    const updated = await prisma.estPorProdPresentacion.update({
      where: { id: input.id },
      data: {
        texto: derivado.texto,
        unidadMedidaId: input.unidadMedidaId,
        presentacionNumerica: new Prisma.Decimal(input.presentacionNumerica),
        conversionAUnidadId: input.conversionAUnidadId,
        conversionAUnidadPresentacion: new Prisma.Decimal(
          input.conversionAUnidadPresentacion
        ),
      },
      include: presentacionInclude,
    });
    return { success: true, data: mapRow(updated) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar la presentación."),
    };
  }
}

export async function eliminarEstPorProdPresentacion(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.estPorProdPresentacion.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar la presentación."),
    };
  }
}
