import { prisma } from "@/lib/prisma";
import {
  normalizarNombreCategoriaMc,
  validarContinuidadRangosMcCategorias,
  type FinAnaMcCategoriaItem,
} from "@/lib/finAnaMcCategorias";
import type {
  CrearFinAnaMcCategoriaInput,
  EditarFinAnaMcCategoriaInput,
  EliminarFinAnaMcCategoriaInput,
} from "@/lib/validations/finAnaMcCategorias";
import type { ServiceResult } from "@/types";

const CATEGORIAS_SEMILLA: {
  id: string;
  categoria: string;
  desdePct: number;
  hastaPct: number;
  orden: number;
}[] = [
  { id: "clfinamccat0000000000001", categoria: "MUY BAJO", desdePct: 0, hastaPct: 20, orden: 10 },
  { id: "clfinamccat0000000000002", categoria: "BAJO", desdePct: 20, hastaPct: 40, orden: 20 },
  { id: "clfinamccat0000000000003", categoria: "MEDIO", desdePct: 40, hastaPct: 60, orden: 30 },
  { id: "clfinamccat0000000000004", categoria: "ALTO", desdePct: 60, hastaPct: 80, orden: 40 },
  { id: "clfinamccat0000000000005", categoria: "MUY ALTO", desdePct: 80, hastaPct: 100, orden: 50 },
];

function mapCategoria(row: {
  id: string;
  categoria: string;
  desdePct: number;
  hastaPct: number;
  orden: number;
}): FinAnaMcCategoriaItem {
  return {
    id: row.id,
    categoria: row.categoria.toLocaleUpperCase("es-AR"),
    desdePct: row.desdePct,
    hastaPct: row.hastaPct,
    orden: row.orden,
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
    if (code === "P2002") return "Ya existe una categoría con ese nombre.";
    if (code === "P2025") return "Categoría no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

/** Semilla idempotente de categorías M.C. (cobertura continua 0…100). */
export async function ensureFinAnaMcCategoriasSeed(): Promise<void> {
  const count = await prisma.finAnaMcCategoria.count();
  if (count > 0) return;

  await prisma.finAnaMcCategoria.createMany({
    data: CATEGORIAS_SEMILLA,
    skipDuplicates: true,
  });
}

export async function listarFinAnaMcCategorias(): Promise<FinAnaMcCategoriaItem[]> {
  await ensureFinAnaMcCategoriasSeed();
  const rows = await prisma.finAnaMcCategoria.findMany({
    orderBy: [{ desdePct: "asc" }, { orden: "asc" }],
    select: {
      id: true,
      categoria: true,
      desdePct: true,
      hastaPct: true,
      orden: true,
    },
  });
  return rows.map(mapCategoria);
}

export async function crearFinAnaMcCategoria(
  input: CrearFinAnaMcCategoriaInput
): Promise<ServiceResult<FinAnaMcCategoriaItem[]>> {
  const categoria = normalizarNombreCategoriaMc(input.categoria);
  if (!categoria) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }

  try {
    const existentes = await listarFinAnaMcCategorias();
    const propuesta = [
      ...existentes.map((row) => ({
        id: row.id,
        categoria: row.categoria,
        desdePct: row.desdePct,
        hastaPct: row.hastaPct,
      })),
      {
        desdePct: input.desdePct,
        hastaPct: input.hastaPct,
        categoria,
      },
    ];
    const errorContinuidad = validarContinuidadRangosMcCategorias(propuesta);
    if (errorContinuidad) {
      return { success: false, error: errorContinuidad };
    }

    const maxOrden = await prisma.finAnaMcCategoria.aggregate({
      _max: { orden: true },
    });
    const orden = (maxOrden._max.orden ?? 0) + 10;

    await prisma.finAnaMcCategoria.create({
      data: {
        categoria,
        desdePct: input.desdePct,
        hastaPct: input.hastaPct,
        orden,
      },
    });

    return { success: true, data: await listarFinAnaMcCategorias() };
  } catch (e) {
    return { success: false, error: mapDbError(e, "Error al crear categoría.") };
  }
}

export async function editarFinAnaMcCategoria(
  input: EditarFinAnaMcCategoriaInput
): Promise<ServiceResult<FinAnaMcCategoriaItem[]>> {
  const categoria = normalizarNombreCategoriaMc(input.categoria);
  if (!categoria) {
    return { success: false, error: "El nombre no puede quedar vacío." };
  }

  try {
    const existentes = await listarFinAnaMcCategorias();
    const actual = existentes.find((row) => row.id === input.id);
    if (!actual) {
      return { success: false, error: "Categoría no encontrada." };
    }

    const propuesta = existentes.map((row) =>
      row.id === input.id
        ? {
            id: row.id,
            categoria,
            desdePct: input.desdePct,
            hastaPct: input.hastaPct,
          }
        : {
            id: row.id,
            categoria: row.categoria,
            desdePct: row.desdePct,
            hastaPct: row.hastaPct,
          }
    );
    const errorContinuidad = validarContinuidadRangosMcCategorias(propuesta);
    if (errorContinuidad) {
      return { success: false, error: errorContinuidad };
    }

    await prisma.finAnaMcCategoria.update({
      where: { id: input.id },
      data: {
        categoria,
        desdePct: input.desdePct,
        hastaPct: input.hastaPct,
      },
    });

    return { success: true, data: await listarFinAnaMcCategorias() };
  } catch (e) {
    return { success: false, error: mapDbError(e, "Error al editar categoría.") };
  }
}

export async function eliminarFinAnaMcCategoria(
  input: EliminarFinAnaMcCategoriaInput
): Promise<ServiceResult<FinAnaMcCategoriaItem[]>> {
  try {
    const existentes = await listarFinAnaMcCategorias();
    if (!existentes.some((row) => row.id === input.id)) {
      return { success: false, error: "Categoría no encontrada." };
    }

    const propuesta = existentes
      .filter((row) => row.id !== input.id)
      .map((row) => ({
        id: row.id,
        categoria: row.categoria,
        desdePct: row.desdePct,
        hastaPct: row.hastaPct,
      }));
    const errorContinuidad = validarContinuidadRangosMcCategorias(propuesta);
    if (errorContinuidad) {
      return {
        success: false,
        error: `${errorContinuidad} Ajustá los rangos vecinos antes de eliminar.`,
      };
    }

    await prisma.finAnaMcCategoria.delete({ where: { id: input.id } });
    return { success: true, data: await listarFinAnaMcCategorias() };
  } catch (e) {
    return {
      success: false,
      error: mapDbError(e, "Error al eliminar categoría."),
    };
  }
}
