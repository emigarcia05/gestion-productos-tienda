import { prisma } from "@/lib/prisma";
import type { MktContenidoUrlDriveItem } from "@/lib/mktContenidoUrlDrive";
import type {
  CrearMktContenidoUrlDriveInput,
  EditarMktContenidoUrlDriveInput,
} from "@/lib/validations/mktContenidoUrlDrive";
import type { ServiceResult } from "@/types/service.types";

const select = {
  id: true,
  nombre: true,
  descripcion: true,
  url: true,
} as const;

function mapRow(row: {
  id: string;
  nombre: string;
  descripcion: string;
  url: string;
}): MktContenidoUrlDriveItem {
  return {
    id: row.id,
    nombre: row.nombre.toLocaleUpperCase("es-AR"),
    descripcion: row.descripcion.trim(),
    url: row.url.trim(),
  };
}

export async function listarMktContenidoUrlDrive(): Promise<MktContenidoUrlDriveItem[]> {
  const rows = await prisma.mktContenidoUrlDrive.findMany({
    orderBy: [{ nombre: "asc" }, { createdAt: "asc" }],
    select,
  });
  return rows.map(mapRow);
}

export async function crearMktContenidoUrlDrive(
  input: CrearMktContenidoUrlDriveInput
): Promise<ServiceResult<MktContenidoUrlDriveItem>> {
  try {
    const row = await prisma.mktContenidoUrlDrive.create({
      data: {
        nombre: input.nombre.trim().toLocaleUpperCase("es-AR"),
        descripcion: input.descripcion.trim(),
        url: input.url.trim(),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo crear el registro.",
    };
  }
}

export async function editarMktContenidoUrlDrive(
  input: EditarMktContenidoUrlDriveInput
): Promise<ServiceResult<MktContenidoUrlDriveItem>> {
  try {
    const row = await prisma.mktContenidoUrlDrive.update({
      where: { id: input.id },
      data: {
        nombre: input.nombre.trim().toLocaleUpperCase("es-AR"),
        descripcion: input.descripcion.trim(),
        url: input.url.trim(),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return { success: false, error: "El registro no existe." };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo actualizar el registro.",
    };
  }
}

export async function eliminarMktContenidoUrlDrive(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.mktContenidoUrlDrive.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      return { success: false, error: "El registro no existe." };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo eliminar el registro.",
    };
  }
}
