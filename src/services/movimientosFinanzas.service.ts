import type { TipoMovimientoFinanzas } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";

export interface MovimientoFinanzasItem {
  id: string;
  nombre: string;
  tipoGasto: TipoMovimientoFinanzas;
  sucursalId: string;
  sucursalNombre: string;
  monto: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearMovimientoFinanzasInput {
  nombre: string;
  tipoGasto: TipoMovimientoFinanzas;
  sucursalId: string;
  monto: number;
}

export interface SucursalOption {
  id: string;
  nombre: string;
}

function mapMovimiento(row: {
  id: string;
  nombre: string;
  tipoGasto: TipoMovimientoFinanzas;
  sucursalId: string;
  monto: unknown;
  createdAt: Date;
  updatedAt: Date;
  sucursal: { nombre: string };
}): MovimientoFinanzasItem {
  return {
    id: row.id,
    nombre: row.nombre.toUpperCase(),
    tipoGasto: row.tipoGasto,
    sucursalId: row.sucursalId,
    sucursalNombre: row.sucursal.nombre,
    monto: Number(row.monto),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
    if (code === "P2003") return "Sucursal inválida para el gasto.";
    if (code === "P2025") return "Gasto no encontrado.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarMovimientosFinanzas(): Promise<MovimientoFinanzasItem[]> {
  const rows = await prisma.movimientoFinanzas.findMany({
    include: { sucursal: { select: { nombre: true } } },
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(mapMovimiento);
}

/** Sucursales con `centro_costo` (modal **Gasto final** e indicadores de catálogo de gastos). */
export async function listarSucursalesParaGastos(): Promise<SucursalOption[]> {
  const rows = await prisma.sucursal.findMany({
    where: { centroCosto: true },
    select: { id: true, nombre: true },
    orderBy: [{ nombre: "asc" }],
  });
  return rows;
}

export async function crearMovimientoFinanzas(
  input: CrearMovimientoFinanzasInput
): Promise<ServiceResult<MovimientoFinanzasItem>> {
  try {
    const row = await prisma.movimientoFinanzas.create({
      data: {
        nombre: input.nombre.trim().toUpperCase(),
        tipoGasto: input.tipoGasto,
        sucursalId: input.sucursalId,
        monto: input.monto,
      },
      include: { sucursal: { select: { nombre: true } } },
    });
    return { success: true, data: mapMovimiento(row) };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear el gasto."),
    };
  }
}
