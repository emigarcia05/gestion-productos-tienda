import { prisma } from "@/lib/prisma";
import type { EstPorProdTerminacionItem } from "@/lib/estPorProdTerminacion";
import type {
  CrearEstPorProdTerminacionInput,
  EditarEstPorProdTerminacionInput,
} from "@/lib/validations/estPorProdTerminacion";
import type { ServiceResult } from "@/types";

function normalizarTerminacion(terminacion: string): string {
  return terminacion.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") return "Ya existe esa terminación.";
    if (code === "P2025") return "Terminación no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarEstPorProdTerminaciones(): Promise<
  EstPorProdTerminacionItem[]
> {
  try {
    const rows = await prisma.estPorProdTerminacion.findMany({
      orderBy: { terminacion: "asc" },
      select: { id: true, terminacion: true },
    });
    return rows.map((r) => ({
      id: r.id,
      terminacion: r.terminacion.toLocaleUpperCase("es-AR"),
    }));
  } catch (e: unknown) {
    console.error(
      "[estPorProdTerminacion.service] listarEstPorProdTerminaciones:",
      e
    );
    return [];
  }
}

export async function crearEstPorProdTerminacion(
  input: CrearEstPorProdTerminacionInput
): Promise<ServiceResult<EstPorProdTerminacionItem>> {
  const terminacion = normalizarTerminacion(input.terminacion);
  if (!terminacion) {
    return { success: false, error: "La terminación no puede quedar vacía." };
  }
  try {
    const created = await prisma.estPorProdTerminacion.create({
      data: { terminacion },
      select: { id: true, terminacion: true },
    });
    return {
      success: true,
      data: { id: created.id, terminacion: created.terminacion },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la terminación."),
    };
  }
}

export async function editarEstPorProdTerminacion(
  input: EditarEstPorProdTerminacionInput
): Promise<ServiceResult<EstPorProdTerminacionItem>> {
  const terminacion = normalizarTerminacion(input.terminacion);
  if (!terminacion) {
    return { success: false, error: "La terminación no puede quedar vacía." };
  }
  try {
    const updated = await prisma.estPorProdTerminacion.update({
      where: { id: input.id },
      data: { terminacion },
      select: { id: true, terminacion: true },
    });
    return {
      success: true,
      data: { id: updated.id, terminacion: updated.terminacion },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo actualizar la terminación."),
    };
  }
}

export async function eliminarEstPorProdTerminacion(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.estPorProdTerminacion.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar la terminación."),
    };
  }
}
