import { prisma } from "@/lib/prisma";
import type { EnviosDireccionItem } from "@/lib/envios";
import type {
  CrearEnviosDireccionInput,
  EditarEnviosDireccionInput,
} from "@/lib/validations/envios";
import type { ServiceResult } from "@/types/service.types";

const select = {
  id: true,
  personaId: true,
  direccion: true,
  numeracion: true,
  urlMaps: true,
  referencia: true,
} as const;

function mapRow(row: {
  id: string;
  personaId: string;
  direccion: string;
  numeracion: string;
  urlMaps: string | null;
  referencia: string | null;
}): EnviosDireccionItem {
  return {
    id: row.id,
    personaId: row.personaId,
    direccion: row.direccion.trim(),
    numeracion: row.numeracion.trim(),
    urlMaps: (row.urlMaps ?? "").trim(),
    referencia: (row.referencia ?? "").trim(),
  };
}

function prismaErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2025") return "La dirección no existe.";
    if (code === "P2003") {
      return "No se puede eliminar: la dirección está asociada a un envío o el cliente no existe.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarEnviosDirecciones(
  personaId?: string
): Promise<EnviosDireccionItem[]> {
  try {
    const rows = await prisma.enviosDireccion.findMany({
      where: personaId ? { personaId } : undefined,
      orderBy: [{ direccion: "asc" }, { numeracion: "asc" }, { createdAt: "asc" }],
      select,
    });
    return rows.map(mapRow);
  } catch (e) {
    console.error("[enviosDirecciones][listar]", e);
    return [];
  }
}

export async function crearEnviosDireccion(
  input: CrearEnviosDireccionInput
): Promise<ServiceResult<EnviosDireccionItem>> {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: input.personaId },
      select: { id: true },
    });
    if (!cliente) {
      return { success: false, error: "El cliente de la dirección no existe." };
    }
    const row = await prisma.enviosDireccion.create({
      data: {
        personaId: input.personaId,
        direccion: input.direccion.trim(),
        numeracion: input.numeracion.trim(),
        urlMaps: input.urlMaps.trim() === "" ? null : input.urlMaps.trim(),
        referencia: input.referencia.trim() === "" ? null : input.referencia.trim(),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    console.error("[enviosDirecciones][crear]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo crear la dirección.") };
  }
}

export async function editarEnviosDireccion(
  input: EditarEnviosDireccionInput
): Promise<ServiceResult<EnviosDireccionItem>> {
  try {
    const row = await prisma.enviosDireccion.update({
      where: { id: input.id },
      data: {
        personaId: input.personaId,
        direccion: input.direccion.trim(),
        numeracion: input.numeracion.trim(),
        urlMaps: input.urlMaps.trim() === "" ? null : input.urlMaps.trim(),
        referencia: input.referencia.trim() === "" ? null : input.referencia.trim(),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    console.error("[enviosDirecciones][editar]", error);
    return {
      success: false,
      error: prismaErrorMessage(error, "No se pudo actualizar la dirección."),
    };
  }
}

export async function eliminarEnviosDireccion(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.enviosDireccion.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    console.error("[enviosDirecciones][eliminar]", error);
    return {
      success: false,
      error: prismaErrorMessage(error, "No se pudo eliminar la dirección."),
    };
  }
}
