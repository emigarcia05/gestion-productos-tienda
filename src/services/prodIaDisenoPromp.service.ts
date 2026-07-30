import { prisma } from "@/lib/prisma";
import type { ProdIaDisenoPrompItem } from "@/lib/asistenteIa";
import type {
  CrearProdIaDisenoPrompInput,
  EditarProdIaDisenoPrompInput,
} from "@/lib/validations/prodIaDisenoPromp";
import type { ServiceResult } from "@/types/service.types";

const select = {
  id: true,
  submodulo: true,
  promp: true,
  urlRedireccion: true,
} as const;

function mapRow(row: {
  id: string;
  submodulo: string;
  promp: string;
  urlRedireccion: string;
}): ProdIaDisenoPrompItem {
  return {
    id: row.id,
    submodulo: row.submodulo.trim(),
    promp: row.promp,
    urlRedireccion: row.urlRedireccion.trim(),
  };
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return "Ya existe un prompt para ese submódulo.";
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  ) {
    return "El registro no existe.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarProdIaDisenoPromps(): Promise<ProdIaDisenoPrompItem[]> {
  const rows = await prisma.prodIaDisenoPromp.findMany({
    orderBy: { submodulo: "asc" },
    select,
  });
  return rows.map(mapRow);
}

export async function getProdIaDisenoPrompPorSubmodulo(
  submodulo: string,
): Promise<ProdIaDisenoPrompItem | null> {
  const row = await prisma.prodIaDisenoPromp.findUnique({
    where: { submodulo: submodulo.trim() },
    select,
  });
  return row ? mapRow(row) : null;
}

export async function crearProdIaDisenoPromp(
  input: CrearProdIaDisenoPrompInput,
): Promise<ServiceResult<ProdIaDisenoPrompItem>> {
  try {
    const row = await prisma.prodIaDisenoPromp.create({
      data: {
        submodulo: input.submodulo.trim(),
        promp: input.promp.trim(),
        urlRedireccion: input.urlRedireccion.trim(),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo crear el prompt.") };
  }
}

export async function editarProdIaDisenoPromp(
  input: EditarProdIaDisenoPrompInput,
): Promise<ServiceResult<ProdIaDisenoPrompItem>> {
  try {
    const row = await prisma.prodIaDisenoPromp.update({
      where: { id: input.id },
      data: {
        promp: input.promp.trim(),
        urlRedireccion: input.urlRedireccion.trim(),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo guardar el prompt.") };
  }
}

export async function eliminarProdIaDisenoPromp(
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.prodIaDisenoPromp.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo eliminar el prompt.") };
  }
}
