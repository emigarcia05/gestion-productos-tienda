import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";
import type {
  CrearFinBalGastoInput,
  CrearFinBalGastoProveeInput,
  CrearFinBalGastoRubroInput,
  CrearFinBalGastoTipoInput,
  EditarFinBalGastoInput,
  EditarFinBalGastoProveeInput,
  EditarFinBalGastoRubroInput,
  EditarFinBalGastoTipoInput,
} from "@/lib/validations/finBalGastosCatalogo";

/**
 * Catálogo jerárquico Finanzas → Balance → Gastos:
 *   fin_bal_gasto_tipo (1) ─→ fin_bal_gasto_rubro (N) ─→ fin_bal_cat_gasto (N)
 *   y asignaciones `fin_bal_gasto_provee` (gasto ↔ proveedor, N por gasto).
 *
 * Convenciones:
 * - `nombre` se persiste en MAYÚSCULAS (ya viene normalizado desde Zod en la Action).
 * - Todas las funciones que pueden fallar devuelven `ServiceResult<T>`.
 * - Códigos Prisma mapeados: P2002 (unique violation), P2003 (FK violation), P2025 (no encontrado).
 */

// ─── Tipos de salida ──────────────────────────────────────────────────────

export interface FinBalGastoTipoItem {
  id: string;
  nombre: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinBalGastoRubroItem {
  id: string;
  nombre: string;
  tipoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinBalGastoItem {
  id: string;
  nombre: string;
  rubroId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Fila de `fin_bal_gasto_provee` con mini-proveedor para UI de catálogo. */
export interface FinBalGastoProveeItem {
  id: string;
  gastoId: string;
  proveedorId: string;
  gastoMensual: boolean;
  proveedor: {
    id: string;
    nombre: string;
    prefijo: string;
  };
}

export interface FinBalGastoJerarquiaGasto extends FinBalGastoItem {
  asignacionesProveedor: FinBalGastoProveeItem[];
}

export interface FinBalGastoJerarquiaRubro extends FinBalGastoRubroItem {
  gastos: FinBalGastoJerarquiaGasto[];
}

export interface FinBalGastoJerarquiaTipo extends FinBalGastoTipoItem {
  rubros: FinBalGastoJerarquiaRubro[];
}

// ─── Mapeo de errores Prisma ──────────────────────────────────────────────

function mapDbError(
  error: unknown,
  context: "tipo" | "rubro" | "gasto" | "gastoProvee",
  fallback: string
): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") {
      if (context === "tipo") return "Ya existe un tipo con ese nombre.";
      if (context === "rubro") return "Ya existe un rubro con ese nombre para el tipo seleccionado.";
      if (context === "gastoProvee") {
        return "Ya existe una asignación de ese proveedor para este gasto.";
      }
      return "Ya existe un gasto con ese nombre en ese rubro.";
    }
    if (code === "P2003") {
      if (context === "rubro") return "El tipo seleccionado no existe.";
      if (context === "gastoProvee") {
        return "El gasto o el proveedor no existe o no es válido.";
      }
      if (context === "gasto") {
        const meta = (error as { meta?: { field_name?: string; constraint?: string } }).meta;
        const field = meta?.field_name ?? meta?.constraint ?? "";
        if (field.includes("rubro")) return "El rubro seleccionado no existe.";
        return "Referencia inválida en el gasto (rubro inexistente).";
      }
      return "No se puede completar la operación por una referencia inválida.";
    }
    if (code === "P2025") {
      if (context === "tipo") return "Tipo no encontrado.";
      if (context === "rubro") return "Rubro no encontrado.";
      if (context === "gastoProvee") return "Asignación no encontrada.";
      return "Gasto no encontrado.";
    }
  }
  return error instanceof Error ? error.message : fallback;
}

// ─── Lecturas ─────────────────────────────────────────────────────────────

/**
 * Devuelve los Tipos sin jerarquía (para selects). Orden alfabético.
 */
export async function listarFinBalGastoTipos(): Promise<FinBalGastoTipoItem[]> {
  const rows = await prisma.finBalGastoTipo.findMany({
    select: { id: true, nombre: true, createdAt: true, updatedAt: true },
    orderBy: [{ nombre: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre.toUpperCase(),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Devuelve los Rubros de un Tipo (para selects dependientes).
 */
export async function listarFinBalGastoRubrosPorTipo(
  tipoId: string
): Promise<FinBalGastoRubroItem[]> {
  const rows = await prisma.finBalGastoRubro.findMany({
    where: { tipoId },
    select: { id: true, nombre: true, tipoId: true, createdAt: true, updatedAt: true },
    orderBy: [{ nombre: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre.toUpperCase(),
    tipoId: r.tipoId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Devuelve los Gastos de un Rubro (para selects dependientes).
 */
export async function listarFinBalGastosPorRubro(
  rubroId: string
): Promise<FinBalGastoItem[]> {
  const rows = await prisma.finBalGasto.findMany({
    where: { rubroId },
    orderBy: [{ nombre: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre.toUpperCase(),
    rubroId: r.rubroId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Devuelve la jerarquía completa Tipo → Rubros → Gastos para UI de árbol.
 * Un único roundtrip vía `include` anidado. Orden alfabético en cada nivel.
 */
export async function listarFinBalGastosJerarquia(): Promise<FinBalGastoJerarquiaTipo[]> {
  const rows = await prisma.finBalGastoTipo.findMany({
    orderBy: [{ nombre: "asc" }],
    include: {
      rubros: {
        orderBy: [{ nombre: "asc" }],
        include: {
          gastos: {
            orderBy: [{ nombre: "asc" }],
            include: {
              asignacionesProveedor: {
                orderBy: [{ proveedor: { nombre: "asc" } }],
                include: {
                  proveedor: { select: { id: true, nombre: true, prefijo: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((tipo) => ({
    id: tipo.id,
    nombre: tipo.nombre.toUpperCase(),
    createdAt: tipo.createdAt,
    updatedAt: tipo.updatedAt,
    rubros: tipo.rubros.map((rubro) => ({
      id: rubro.id,
      nombre: rubro.nombre.toUpperCase(),
      tipoId: rubro.tipoId,
      createdAt: rubro.createdAt,
      updatedAt: rubro.updatedAt,
      gastos: rubro.gastos.map((gasto) => ({
        id: gasto.id,
        nombre: gasto.nombre.toUpperCase(),
        rubroId: gasto.rubroId,
        createdAt: gasto.createdAt,
        updatedAt: gasto.updatedAt,
        asignacionesProveedor: gasto.asignacionesProveedor.map((a) => ({
          id: a.id,
          gastoId: a.gastoId,
          proveedorId: a.proveedorId,
          gastoMensual: a.gastoMensual,
          proveedor: {
            id: a.proveedor.id,
            nombre: a.proveedor.nombre.toUpperCase(),
            prefijo: a.proveedor.prefijo,
          },
        })),
      })),
    })),
  }));
}

// ─── Escrituras: Tipo ─────────────────────────────────────────────────────

export async function crearFinBalGastoTipo(
  input: CrearFinBalGastoTipoInput
): Promise<ServiceResult<FinBalGastoTipoItem>> {
  try {
    const row = await prisma.finBalGastoTipo.create({
      data: { nombre: input.nombre },
    });
    return {
      success: true,
      data: {
        id: row.id,
        nombre: row.nombre.toUpperCase(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "tipo", "No se pudo crear el tipo."),
    };
  }
}

export async function editarFinBalGastoTipo(
  input: EditarFinBalGastoTipoInput
): Promise<ServiceResult<FinBalGastoTipoItem>> {
  try {
    const row = await prisma.finBalGastoTipo.update({
      where: { id: input.id },
      data: { nombre: input.nombre },
    });
    return {
      success: true,
      data: {
        id: row.id,
        nombre: row.nombre.toUpperCase(),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "tipo", "No se pudo editar el tipo."),
    };
  }
}

export async function eliminarFinBalGastoTipo(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalGastoTipo.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    // P2003 aquí indica FK violation: hay rubros hijos.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2003"
    ) {
      return {
        success: false,
        error: "No se puede eliminar: el tipo tiene rubros asociados.",
      };
    }
    return {
      success: false,
      error: mapDbError(error, "tipo", "No se pudo eliminar el tipo."),
    };
  }
}

// ─── Escrituras: Rubro ────────────────────────────────────────────────────

export async function crearFinBalGastoRubro(
  input: CrearFinBalGastoRubroInput
): Promise<ServiceResult<FinBalGastoRubroItem>> {
  try {
    const row = await prisma.finBalGastoRubro.create({
      data: { nombre: input.nombre, tipoId: input.tipoId },
    });
    return {
      success: true,
      data: {
        id: row.id,
        nombre: row.nombre.toUpperCase(),
        tipoId: row.tipoId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "rubro", "No se pudo crear el rubro."),
    };
  }
}

export async function editarFinBalGastoRubro(
  input: EditarFinBalGastoRubroInput
): Promise<ServiceResult<FinBalGastoRubroItem>> {
  try {
    const row = await prisma.finBalGastoRubro.update({
      where: { id: input.id },
      data: { nombre: input.nombre, tipoId: input.tipoId },
    });
    return {
      success: true,
      data: {
        id: row.id,
        nombre: row.nombre.toUpperCase(),
        tipoId: row.tipoId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "rubro", "No se pudo editar el rubro."),
    };
  }
}

export async function eliminarFinBalGastoRubro(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalGastoRubro.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2003"
    ) {
      return {
        success: false,
        error: "No se puede eliminar: el rubro tiene gastos asociados.",
      };
    }
    return {
      success: false,
      error: mapDbError(error, "rubro", "No se pudo eliminar el rubro."),
    };
  }
}

// ─── Escrituras: Gasto ────────────────────────────────────────────────────

export async function crearFinBalGasto(
  input: CrearFinBalGastoInput
): Promise<ServiceResult<FinBalGastoItem>> {
  try {
    const row = await prisma.finBalGasto.create({
      data: {
        nombre: input.nombre,
        rubroId: input.rubroId,
      },
    });
    return {
      success: true,
      data: {
        id: row.id,
        nombre: row.nombre.toUpperCase(),
        rubroId: row.rubroId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gasto", "No se pudo crear el gasto."),
    };
  }
}

export async function editarFinBalGasto(
  input: EditarFinBalGastoInput
): Promise<ServiceResult<FinBalGastoItem>> {
  try {
    const row = await prisma.finBalGasto.update({
      where: { id: input.id },
      data: {
        nombre: input.nombre,
        rubroId: input.rubroId,
      },
    });
    return {
      success: true,
      data: {
        id: row.id,
        nombre: row.nombre.toUpperCase(),
        rubroId: row.rubroId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gasto", "No se pudo editar el gasto."),
    };
  }
}

export async function eliminarFinBalGasto(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalGasto.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gasto", "No se pudo eliminar el gasto."),
    };
  }
}

// ─── Escrituras: Gasto ↔ proveedor (`fin_bal_gasto_provee`) ───────────────

function mapFinBalGastoProveeRow(row: {
  id: string;
  gastoId: string;
  proveedorId: string;
  gastoMensual: boolean;
  proveedor: { id: string; nombre: string; prefijo: string };
}): FinBalGastoProveeItem {
  return {
    id: row.id,
    gastoId: row.gastoId,
    proveedorId: row.proveedorId,
    gastoMensual: row.gastoMensual,
    proveedor: {
      id: row.proveedor.id,
      nombre: row.proveedor.nombre.toUpperCase(),
      prefijo: row.proveedor.prefijo,
    },
  };
}

export async function crearFinBalGastoProvee(
  input: CrearFinBalGastoProveeInput
): Promise<ServiceResult<FinBalGastoProveeItem>> {
  try {
    const row = await prisma.finBalGastoProvee.create({
      data: {
        gastoId: input.gastoId,
        proveedorId: input.proveedorId,
        gastoMensual: input.gastoMensual,
      },
      include: {
        proveedor: { select: { id: true, nombre: true, prefijo: true } },
      },
    });
    return { success: true, data: mapFinBalGastoProveeRow(row) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gastoProvee", "No se pudo crear la asignación."),
    };
  }
}

export async function editarFinBalGastoProvee(
  input: EditarFinBalGastoProveeInput
): Promise<ServiceResult<FinBalGastoProveeItem>> {
  try {
    const row = await prisma.finBalGastoProvee.update({
      where: { id: input.id },
      data: {
        proveedorId: input.proveedorId,
        gastoMensual: input.gastoMensual,
      },
      include: {
        proveedor: { select: { id: true, nombre: true, prefijo: true } },
      },
    });
    return { success: true, data: mapFinBalGastoProveeRow(row) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gastoProvee", "No se pudo editar la asignación."),
    };
  }
}

export async function eliminarFinBalGastoProvee(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalGastoProvee.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gastoProvee", "No se pudo eliminar la asignación."),
    };
  }
}
