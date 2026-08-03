import { prisma } from "@/lib/prisma";
import type {
  ProdIaDisenoCatalogoKind,
  ProdIaDisenoCatalogoNombreItem,
} from "@/lib/prodIaDisenoCatalogos";
import { sentenceCaseTextoCatalogo } from "@/lib/prodIaDisenoCatalogos";
import type {
  CrearProdIaDisenoCatalogoNombreInput,
  EditarProdIaDisenoCatalogoNombreInput,
} from "@/lib/validations/prodIaDisenoCatalogos";
import type { ServiceResult } from "@/types/service.types";

const select = { id: true, nombre: true, texto: true } as const;

function normalizarNombre(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

/** Texto de prompt: trim + espacios. Combinar → minúsculas; resto → sentence case. */
function normalizarTexto(kind: ProdIaDisenoCatalogoKind, value: string): string {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return t;
  if (kind === "combinar") {
    return t.toLocaleLowerCase("en-US");
  }
  return sentenceCaseTextoCatalogo(t);
}

function mapRow(row: {
  id: string;
  nombre: string;
  texto: string;
}): ProdIaDisenoCatalogoNombreItem {
  return {
    id: row.id,
    nombre: row.nombre.trim(),
    texto: row.texto.trim(),
  };
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return "Ya existe un ítem con ese nombre o texto.";
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

function orderByForKind(
  kind: ProdIaDisenoCatalogoKind,
): { nombre: "asc" } | { createdAt: "asc" } {
  if (kind === "luz_natural" || kind === "luz_artificial") {
    return { createdAt: "asc" };
  }
  return { nombre: "asc" };
}

export async function listarProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
): Promise<ProdIaDisenoCatalogoNombreItem[]> {
  const rows = await prisma.prodIaDisenoCatalogo.findMany({
    where: { kind },
    orderBy: orderByForKind(kind),
    select,
  });
  return rows.map(mapRow);
}

export async function crearProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
  input: CrearProdIaDisenoCatalogoNombreInput,
): Promise<ServiceResult<ProdIaDisenoCatalogoNombreItem>> {
  try {
    const row = await prisma.prodIaDisenoCatalogo.create({
      data: {
        kind,
        nombre: normalizarNombre(input.nombre),
        texto: normalizarTexto(kind, input.texto),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo crear el ítem.") };
  }
}

export async function editarProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
  input: EditarProdIaDisenoCatalogoNombreInput,
): Promise<ServiceResult<ProdIaDisenoCatalogoNombreItem>> {
  try {
    const existing = await prisma.prodIaDisenoCatalogo.findFirst({
      where: { id: input.id, kind },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "El registro no existe." };
    }
    const row = await prisma.prodIaDisenoCatalogo.update({
      where: { id: input.id },
      data: {
        nombre: normalizarNombre(input.nombre),
        texto: normalizarTexto(kind, input.texto),
      },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo guardar el ítem.") };
  }
}

export async function eliminarProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const existing = await prisma.prodIaDisenoCatalogo.findFirst({
      where: { id, kind },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "El registro no existe." };
    }
    await prisma.prodIaDisenoCatalogo.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo eliminar el ítem.") };
  }
}
