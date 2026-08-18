import { prisma } from "@/lib/prisma";
import type { EnviosPersonaItem } from "@/lib/envios";
import type {
  CrearEnviosPersonaInput,
  EditarEnviosPersonaInput,
} from "@/lib/validations/envios";
import type { ServiceResult } from "@/types/service.types";

const select = {
  id: true,
  nombre: true,
  apellido: true,
  cel: true,
  tipo: true,
} as const;

function mapRow(row: EnviosPersonaItem): EnviosPersonaItem {
  return {
    id: row.id,
    nombre: row.nombre.trim(),
    apellido: row.apellido.trim(),
    cel: row.cel.trim(),
    tipo: row.tipo,
  };
}

function prismaErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "P2025") return "La persona no existe.";
    if (code === "P2003") {
      return "No se puede eliminar: la persona está asociada a un envío o a una dirección.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarEnviosPersonas(): Promise<EnviosPersonaItem[]> {
  try {
    const rows = await prisma.enviosPersona.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }, { createdAt: "asc" }],
      select,
    });
    return rows.map(mapRow);
  } catch (e) {
    console.error("[enviosPersonas][listar]", e);
    return [];
  }
}

export async function crearEnviosPersona(
  input: CrearEnviosPersonaInput
): Promise<ServiceResult<EnviosPersonaItem>> {
  try {
    const row = await prisma.enviosPersona.create({
      data: {
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        cel: input.cel.trim(),
        tipo: input.tipo,
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    console.error("[enviosPersonas][crear]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo crear la persona.") };
  }
}

export async function editarEnviosPersona(
  input: EditarEnviosPersonaInput
): Promise<ServiceResult<EnviosPersonaItem>> {
  try {
    const usada = await prisma.enviosFinal.findFirst({
      where:
        input.tipo === "CLIENTE_FINAL"
          ? { pintorId: input.id }
          : { clienteFinalId: input.id },
      select: { id: true },
    });
    if (usada) {
      return {
        success: false,
        error:
          "No se puede cambiar el tipo: la persona ya está asociada a un envío con el tipo actual.",
      };
    }
    const row = await prisma.enviosPersona.update({
      where: { id: input.id },
      data: {
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        cel: input.cel.trim(),
        tipo: input.tipo,
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    console.error("[enviosPersonas][editar]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo actualizar la persona.") };
  }
}

export async function eliminarEnviosPersona(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.enviosPersona.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    console.error("[enviosPersonas][eliminar]", error);
    return { success: false, error: prismaErrorMessage(error, "No se pudo eliminar la persona.") };
  }
}
