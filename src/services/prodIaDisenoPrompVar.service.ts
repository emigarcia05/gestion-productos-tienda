import { prisma } from "@/lib/prisma";
import {
  normalizarNombreVariablePrompt,
  type ProdIaDisenoPrompVarItem,
} from "@/lib/asistenteIa";
import type { GuardarProdIaDisenoPrompVarsInput } from "@/lib/validations/prodIaDisenoPrompVar";
import type { ServiceResult } from "@/types/service.types";

const select = {
  id: true,
  prompId: true,
  fuente: true,
  variable: true,
} as const;

function mapRow(row: {
  id: string;
  prompId: string;
  fuente: string;
  variable: string;
}): ProdIaDisenoPrompVarItem {
  return {
    id: row.id,
    prompId: row.prompId,
    fuente: row.fuente.trim(),
    variable: row.variable.trim().toUpperCase(),
  };
}

export async function listarProdIaDisenoPrompVars(
  prompId: string,
): Promise<ProdIaDisenoPrompVarItem[]> {
  const rows = await prisma.prodIaDisenoPrompVar.findMany({
    where: { prompId },
    orderBy: { fuente: "asc" },
    select,
  });
  return rows.map(mapRow);
}

export async function guardarProdIaDisenoPrompVars(
  input: GuardarProdIaDisenoPrompVarsInput,
): Promise<ServiceResult<ProdIaDisenoPrompVarItem[]>> {
  try {
    const promp = await prisma.prodIaDisenoPromp.findUnique({
      where: { id: input.prompId },
      select: { id: true },
    });
    if (!promp) {
      return { success: false, error: "El prompt no existe." };
    }

    const normalized = input.items.map((item) => ({
      fuente: item.fuente.trim(),
      variable: normalizarNombreVariablePrompt(item.variable),
    }));

    if (normalized.some((i) => !i.variable)) {
      return {
        success: false,
        error: "Todos los nombres de variable deben ser válidos (MAYÚSCULA).",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.prodIaDisenoPrompVar.deleteMany({
        where: { prompId: input.prompId },
      });
      await tx.prodIaDisenoPrompVar.createMany({
        data: normalized.map((item) => ({
          prompId: input.prompId,
          fuente: item.fuente,
          variable: item.variable,
        })),
      });
    });

    return {
      success: true,
      data: await listarProdIaDisenoPrompVars(input.prompId),
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "Hay nombres de variable o fuentes duplicados.",
      };
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las variables.",
    };
  }
}
