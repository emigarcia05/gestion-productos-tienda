import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EstPorProdLtsConversionItem } from "@/lib/estPorProdLtsConversion";
import type {
  CrearEstPorProdLtsConversionInput,
  EditarEstPorProdLtsConversionInput,
} from "@/lib/validations/estPorProdLtsConversion";
import type { ServiceResult } from "@/types";

function normalizarTextoConversion(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapRow(r: {
  id: string;
  texto: string;
  conversionLts: Prisma.Decimal;
}): EstPorProdLtsConversionItem {
  return {
    id: r.id,
    texto: r.texto.toLocaleUpperCase("es-AR"),
    conversionLts: toNumber(r.conversionLts),
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
    if (code === "P2002") return "Ya existe una conversión con ese texto.";
    if (code === "P2025") return "Conversión no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarEstPorProdLtsConversiones(): Promise<
  EstPorProdLtsConversionItem[]
> {
  try {
    const rows = await prisma.estPorProdLtsConversion.findMany({
      orderBy: { texto: "asc" },
      select: { id: true, texto: true, conversionLts: true },
    });
    return rows.map(mapRow);
  } catch (e: unknown) {
    console.error(
      "[estPorProdLtsConversion.service] listarEstPorProdLtsConversiones:",
      e
    );
    return [];
  }
}

export async function crearEstPorProdLtsConversion(
  input: CrearEstPorProdLtsConversionInput
): Promise<ServiceResult<EstPorProdLtsConversionItem>> {
  const texto = normalizarTextoConversion(input.texto);
  if (!texto) {
    return { success: false, error: "El texto no puede quedar vacío." };
  }
  try {
    const created = await prisma.estPorProdLtsConversion.create({
      data: {
        texto,
        conversionLts: new Prisma.Decimal(input.conversionLts),
      },
      select: { id: true, texto: true, conversionLts: true },
    });
    return { success: true, data: mapRow(created) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la conversión."),
    };
  }
}

export async function editarEstPorProdLtsConversion(
  input: EditarEstPorProdLtsConversionInput
): Promise<ServiceResult<EstPorProdLtsConversionItem>> {
  const texto = normalizarTextoConversion(input.texto);
  if (!texto) {
    return { success: false, error: "El texto no puede quedar vacío." };
  }
  try {
    const updated = await prisma.estPorProdLtsConversion.update({
      where: { id: input.id },
      data: {
        texto,
        conversionLts: new Prisma.Decimal(input.conversionLts),
      },
      select: { id: true, texto: true, conversionLts: true },
    });
    return { success: true, data: mapRow(updated) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar la conversión."),
    };
  }
}

export async function eliminarEstPorProdLtsConversion(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.estPorProdLtsConversion.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar la conversión."),
    };
  }
}
