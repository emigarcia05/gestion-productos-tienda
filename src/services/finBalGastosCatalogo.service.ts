import { type IvaProveedor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";
import type {
  CrearFinBalGastoFinalInput,
  CrearFinBalGastoInput,
  CrearFinBalGastoRubroInput,
  CrearFinBalGastoTipoInput,
  EditarFinBalGastoFinalInput,
  EditarFinBalGastoInput,
  EditarFinBalGastoRubroInput,
  EditarFinBalGastoTipoInput,
} from "@/lib/validations/finBalGastosCatalogo";

/**
 * Catálogo jerárquico Finanzas → Balance → Gastos:
 *   fin_bal_gasto_tipo (1) ─→ fin_bal_gasto_rubro (N) ─→ fin_bal_cat_gasto (N)
 *   y filas `fin_bal_gasto_final` (gasto + proveedor + sucursal + mensual + día devengado + comentarios opcional, N por gasto).
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

/** Fila de `fin_bal_gasto_final` con proveedor y sucursal para UI de catálogo. */
export interface FinBalGastoFinalItem {
  id: string;
  gastoId: string;
  proveedorId: string;
  sucursalId: string;
  gastoMensual: boolean;
  /** 1–28 en mensual; `null` en eventual. */
  diaDevengado: number | null;
  /** Días entre fecha de gasto (devengo) y fecha de pago. */
  vencimiento: number | null;
  /** Texto libre (`fin_bal_gasto_final.comentarios`). */
  comentarios: string | null;
  /**
   * Política IVA del gasto final (default DB `PREGUNTA`). Reusa enum
   * `IvaProveedor`. Es **independiente** de `proveedor.iva`.
   */
  iva: IvaProveedor;
  proveedor: {
    id: string;
    nombre: string;
    prefijo: string;
  };
  sucursal: {
    id: string;
    nombre: string;
  };
}

export interface FinBalGastoJerarquiaGasto extends FinBalGastoItem {
  asignacionesFinales: FinBalGastoFinalItem[];
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
  context: "tipo" | "rubro" | "gasto" | "gastoFinal",
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
      if (context === "gastoFinal") {
        return "Violación de unicidad en gasto final. Ejecute `npx prisma migrate deploy` en el servidor (debe aplicarse la migración que elimina el índice único gasto+proveedor+sucursal). Si ya migró, use COMENTARIOS distintos para cada fila con el mismo proveedor y sucursal.";
      }
      return "Ya existe un gasto con ese nombre en ese rubro.";
    }
    if (code === "P2003") {
      if (context === "rubro") return "El tipo seleccionado no existe.";
      if (context === "gastoFinal") {
        return "El gasto, el proveedor o la sucursal no existe o no es válido.";
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
      if (context === "gastoFinal") return "Gasto final no encontrado.";
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
              asignacionesFinales: {
                orderBy: [{ proveedor: { nombre: "asc" } }, { sucursal: { nombre: "asc" } }],
                include: {
                  proveedor: { select: { id: true, nombre: true, prefijo: true } },
                  sucursal: { select: { id: true, nombre: true } },
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
        asignacionesFinales: gasto.asignacionesFinales.map((a) => ({
          id: a.id,
          gastoId: a.gastoId,
          proveedorId: a.proveedorId,
          sucursalId: a.sucursalId,
          gastoMensual: a.gastoMensual,
          diaDevengado: a.diaDevengado,
          vencimiento: a.vencimiento,
          comentarios: a.comentarios,
          iva: a.iva,
          proveedor: {
            id: a.proveedor.id,
            nombre: a.proveedor.nombre.toUpperCase(),
            prefijo: a.proveedor.prefijo ?? "",
          },
          sucursal: {
            id: a.sucursal.id,
            nombre: a.sucursal.nombre.toUpperCase(),
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

// ─── Escrituras: Gasto final (`fin_bal_gasto_final`) ──────────────────────

function mapFinBalGastoFinalRow(row: {
  id: string;
  gastoId: string;
  proveedorId: string;
  sucursalId: string;
  gastoMensual: boolean;
  diaDevengado: number | null;
  vencimiento: number | null;
  comentarios: string | null;
  iva: IvaProveedor;
  proveedor: { id: string; nombre: string; prefijo: string | null };
  sucursal: { id: string; nombre: string };
}): FinBalGastoFinalItem {
  return {
    id: row.id,
    gastoId: row.gastoId,
    proveedorId: row.proveedorId,
    sucursalId: row.sucursalId,
    gastoMensual: row.gastoMensual,
    diaDevengado: row.diaDevengado,
    vencimiento: row.vencimiento,
    comentarios: row.comentarios,
    iva: row.iva,
    proveedor: {
      id: row.proveedor.id,
      nombre: row.proveedor.nombre.toUpperCase(),
      prefijo: row.proveedor.prefijo ?? "",
    },
    sucursal: {
      id: row.sucursal.id,
      nombre: row.sucursal.nombre.toUpperCase(),
    },
  };
}

async function sucursalEsCentroDeCosto(sucursalId: string): Promise<boolean> {
  const s = await prisma.sucursal.findUnique({
    where: { id: sucursalId },
    select: { centroCosto: true },
  });
  return Boolean(s?.centroCosto);
}

/** Comentarios persistidos comparables (misma regla que Zod `comentariosFinBalGastoFinalSchema`). */
function comentariosGastoFinalNormalizado(c: string | null | undefined): string {
  if (c == null) return "";
  const t = c.trim().toLocaleUpperCase("es-AR");
  return t === "" ? "" : t;
}

/**
 * Si ya hay otra fila con el mismo gasto + proveedor + sucursal, hace obligatorio un COMENTARIOS no vacío
 * y distinto (normalizado) al resto, para poder coexistir varias filas sin índice único en BD.
 */
async function validarComentariosParaTriplaGastoFinalRepetida(params: {
  gastoId: string;
  proveedorId: string;
  sucursalId: string;
  comentarios: string | null;
  excludeId?: string;
}): Promise<ServiceResult<void>> {
  const norm = comentariosGastoFinalNormalizado(params.comentarios);
  const otros = await prisma.finBalGastoFinal.findMany({
    where: {
      gastoId: params.gastoId,
      proveedorId: params.proveedorId,
      sucursalId: params.sucursalId,
      ...(params.excludeId ? { NOT: { id: params.excludeId } } : {}),
    },
    select: { comentarios: true },
  });
  if (otros.length === 0) {
    return { success: true, data: undefined };
  }
  if (norm === "") {
    return {
      success: false,
      error:
        "Ya existe un gasto final con el mismo proveedor y sucursal para este gasto. Ingrese COMENTARIOS para diferenciar esta fila.",
    };
  }
  for (const o of otros) {
    if (comentariosGastoFinalNormalizado(o.comentarios) === norm) {
      return {
        success: false,
        error:
          "Ya existe otra fila con el mismo proveedor, sucursal y comentarios. Cambie el texto en COMENTARIOS.",
      };
    }
  }
  return { success: true, data: undefined };
}

export async function crearFinBalGastoFinal(
  input: CrearFinBalGastoFinalInput
): Promise<ServiceResult<FinBalGastoFinalItem>> {
  if (!(await sucursalEsCentroDeCosto(input.sucursalId))) {
    return {
      success: false,
      error: "La sucursal debe tener centro de costo activado.",
    };
  }
  const triplaOk = await validarComentariosParaTriplaGastoFinalRepetida({
    gastoId: input.gastoId,
    proveedorId: input.proveedorId,
    sucursalId: input.sucursalId,
    comentarios: input.comentarios ?? null,
  });
  if (!triplaOk.success) {
    return { success: false, error: triplaOk.error };
  }
  try {
    const row = await prisma.finBalGastoFinal.create({
      data: {
        gastoId: input.gastoId,
        proveedorId: input.proveedorId,
        sucursalId: input.sucursalId,
        gastoMensual: input.gastoMensual,
        diaDevengado: input.gastoMensual ? 1 : (input.diaDevengado ?? 1),
        vencimiento: input.gastoMensual ? 0 : (input.vencimiento ?? 0),
        comentarios: input.comentarios ?? null,
        iva: input.iva,
      },
      include: {
        proveedor: { select: { id: true, nombre: true, prefijo: true } },
        sucursal: { select: { id: true, nombre: true } },
      },
    });
    return { success: true, data: mapFinBalGastoFinalRow(row) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gastoFinal", "No se pudo crear el gasto final."),
    };
  }
}

export async function editarFinBalGastoFinal(
  input: EditarFinBalGastoFinalInput
): Promise<ServiceResult<FinBalGastoFinalItem>> {
  const prev = await prisma.finBalGastoFinal.findUnique({
    where: { id: input.id },
    select: { sucursalId: true, gastoId: true, gastoMensual: true },
  });
  if (!prev) {
    return { success: false, error: "Gasto final no encontrado." };
  }
  if (
    input.sucursalId !== prev.sucursalId &&
    !(await sucursalEsCentroDeCosto(input.sucursalId))
  ) {
    return {
      success: false,
      error: "La sucursal debe tener centro de costo activado.",
    };
  }
  const triplaOk = await validarComentariosParaTriplaGastoFinalRepetida({
    gastoId: prev.gastoId,
    proveedorId: input.proveedorId,
    sucursalId: input.sucursalId,
    comentarios: input.comentarios ?? null,
    excludeId: input.id,
  });
  if (!triplaOk.success) {
    return { success: false, error: triplaOk.error };
  }
  const diaDevengadoPersist = input.gastoMensual ? 1 : (input.diaDevengado ?? 1);
  const plazoPagoPersist = input.gastoMensual ? 0 : (input.vencimiento ?? 0);
  try {
    const row = await prisma.finBalGastoFinal.update({
      where: { id: input.id },
      data: {
        proveedorId: input.proveedorId,
        sucursalId: input.sucursalId,
        gastoMensual: input.gastoMensual,
        diaDevengado: diaDevengadoPersist,
        vencimiento: plazoPagoPersist,
        comentarios: input.comentarios ?? null,
        iva: input.iva,
      },
      include: {
        proveedor: { select: { id: true, nombre: true, prefijo: true } },
        sucursal: { select: { id: true, nombre: true } },
      },
    });
    return { success: true, data: mapFinBalGastoFinalRow(row) };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gastoFinal", "No se pudo editar el gasto final."),
    };
  }
}

export async function eliminarFinBalGastoFinal(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  try {
    await prisma.finBalGastoFinal.delete({ where: { id } });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: mapDbError(error, "gastoFinal", "No se pudo eliminar el gasto final."),
    };
  }
}
