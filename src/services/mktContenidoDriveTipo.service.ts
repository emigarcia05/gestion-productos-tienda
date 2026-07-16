import { prisma } from "@/lib/prisma";
import type { MktContenidoDriveTipoItem } from "@/lib/mktContenidoUrlDrive";
import type {
  CrearMktContenidoDriveTipoInput,
  EditarMktContenidoDriveTipoInput,
} from "@/lib/validations/mktContenidoDriveTipo";
import type { ServiceResult } from "@/types/service.types";

const select = { id: true, tipo: true } as const;

function mapRow(row: { id: string; tipo: string }): MktContenidoDriveTipoItem {
  return {
    id: row.id,
    tipo: row.tipo.toLocaleUpperCase("es-AR"),
  };
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return "Ya existe un tipo con ese nombre.";
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2003"
  ) {
    return "No se puede eliminar: hay contenidos que usan este tipo.";
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  ) {
    return "El tipo no existe.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarMktContenidoDriveTipos(): Promise<MktContenidoDriveTipoItem[]> {
  const rows = await prisma.mktContenidoDriveTipo.findMany({
    orderBy: { tipo: "asc" },
    select,
  });
  return rows.map(mapRow);
}

export async function crearMktContenidoDriveTipo(
  input: CrearMktContenidoDriveTipoInput
): Promise<ServiceResult<MktContenidoDriveTipoItem>> {
  try {
    const row = await prisma.mktContenidoDriveTipo.create({
      data: { tipo: input.tipo.trim().toLocaleUpperCase("es-AR") },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo crear el tipo.") };
  }
}

export async function editarMktContenidoDriveTipo(
  input: EditarMktContenidoDriveTipoInput
): Promise<ServiceResult<MktContenidoDriveTipoItem>> {
  try {
    const row = await prisma.mktContenidoDriveTipo.update({
      where: { id: input.id },
      data: { tipo: input.tipo.trim().toLocaleUpperCase("es-AR") },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo actualizar el tipo.") };
  }
}

export async function eliminarMktContenidoDriveTipo(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktContenidoDriveTipo.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo eliminar el tipo.") };
  }
}
