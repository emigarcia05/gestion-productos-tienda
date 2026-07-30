import { prisma } from "@/lib/prisma";
import type {
  ProdIaDisenoCatalogoKind,
  ProdIaDisenoCatalogoNombreItem,
} from "@/lib/prodIaDisenoCatalogos";
import type {
  CrearProdIaDisenoCatalogoNombreInput,
  EditarProdIaDisenoCatalogoNombreInput,
} from "@/lib/validations/prodIaDisenoCatalogos";
import type { ServiceResult } from "@/types/service.types";

const select = { id: true, nombre: true } as const;

function mapRow(row: { id: string; nombre: string }): ProdIaDisenoCatalogoNombreItem {
  return { id: row.id, nombre: row.nombre.trim() };
}

function mapDbError(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    return "Ya existe un ítem con ese nombre.";
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

type Delegate = {
  findMany: (args: {
    orderBy: { nombre: "asc" } | { createdAt: "asc" };
    select: typeof select;
  }) => Promise<{ id: string; nombre: string }[]>;
  create: (args: {
    data: { nombre: string };
    select: typeof select;
  }) => Promise<{ id: string; nombre: string }>;
  update: (args: {
    where: { id: string };
    data: { nombre: string };
    select: typeof select;
  }) => Promise<{ id: string; nombre: string }>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

function delegateForKind(kind: ProdIaDisenoCatalogoKind): Delegate {
  switch (kind) {
    case "sup_pintar":
      return prisma.prodIaDisenoSupPintar as unknown as Delegate;
    case "estilos":
      return prisma.prodIaDisenoEstilos as unknown as Delegate;
    case "combinar":
      return prisma.prodIaDisenoCombinar as unknown as Delegate;
    case "objetivo":
      return prisma.prodIaDisenoObjetivo as unknown as Delegate;
    case "luz_natural":
      return prisma.prodIaDisenoLuzNat as unknown as Delegate;
    case "luz_artificial":
      return prisma.prodIaDisenoLuzArt as unknown as Delegate;
  }
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
  kind: ProdIaDisenoCatalogoKind
): Promise<ProdIaDisenoCatalogoNombreItem[]> {
  const rows = await delegateForKind(kind).findMany({
    orderBy: orderByForKind(kind),
    select,
  });
  return rows.map(mapRow);
}

export async function crearProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
  input: CrearProdIaDisenoCatalogoNombreInput
): Promise<ServiceResult<ProdIaDisenoCatalogoNombreItem>> {
  try {
    const row = await delegateForKind(kind).create({
      data: { nombre: input.nombre.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR") },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo crear el ítem.") };
  }
}

export async function editarProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
  input: EditarProdIaDisenoCatalogoNombreInput
): Promise<ServiceResult<ProdIaDisenoCatalogoNombreItem>> {
  try {
    const row = await delegateForKind(kind).update({
      where: { id: input.id },
      data: { nombre: input.nombre.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR") },
      select,
    });
    return { success: true, data: mapRow(row) };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo guardar el ítem.") };
  }
}

export async function eliminarProdIaDisenoCatalogoNombre(
  kind: ProdIaDisenoCatalogoKind,
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await delegateForKind(kind).delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: mapDbError(error, "No se pudo eliminar el ítem.") };
  }
}
