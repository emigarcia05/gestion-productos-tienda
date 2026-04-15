import type { TipoCajaTesoreria } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";

export interface CajaTesoreriaItem {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: TipoCajaTesoreria;
  monto: number;
  ultActualizacion: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearCajaTesoreriaInput {
  nombreCaja: string;
  titular: string;
  tipoCaja: TipoCajaTesoreria;
  monto: number;
}

export interface EditarCajaTesoreriaInput extends CrearCajaTesoreriaInput {
  id: string;
}

function mapCaja(row: {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: TipoCajaTesoreria;
  monto: number;
  ultActualizacion: Date;
  createdAt: Date;
  updatedAt: Date;
}): CajaTesoreriaItem {
  return {
    id: row.id,
    nombreCaja: row.nombreCaja.toUpperCase(),
    titular: row.titular.toUpperCase(),
    tipoCaja: row.tipoCaja,
    monto: row.monto,
    ultActualizacion: row.ultActualizacion,
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
    if (code === "P2002") return "Ya existe una caja con ese nombre.";
    if (code === "P2025") return "Caja no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarCajasTesoreria(): Promise<CajaTesoreriaItem[]> {
  const rows = await prisma.cajaTesoreria.findMany({
    orderBy: [{ nombreCaja: "asc" }],
  });
  return rows.map(mapCaja);
}

export async function crearCajaTesoreria(
  input: CrearCajaTesoreriaInput
): Promise<ServiceResult<CajaTesoreriaItem>> {
  try {
    const row = await prisma.cajaTesoreria.create({
      data: {
        nombreCaja: input.nombreCaja.trim().toUpperCase(),
        titular: input.titular.trim().toUpperCase(),
        tipoCaja: input.tipoCaja,
        monto: input.monto,
      },
    });
    return { success: true, data: mapCaja(row) };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo crear la caja de tesorería."),
    };
  }
}

export async function editarCajaTesoreria(
  input: EditarCajaTesoreriaInput
): Promise<ServiceResult<CajaTesoreriaItem>> {
  try {
    const row = await prisma.cajaTesoreria.update({
      where: { id: input.id },
      data: {
        nombreCaja: input.nombreCaja.trim().toUpperCase(),
        titular: input.titular.trim().toUpperCase(),
        tipoCaja: input.tipoCaja,
        monto: input.monto,
      },
    });
    return { success: true, data: mapCaja(row) };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo editar la caja de tesorería."),
    };
  }
}

export async function eliminarCajaTesoreria(id: string): Promise<ServiceResult<void>> {
  try {
    await prisma.cajaTesoreria.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return {
      success: false,
      error: mapDbError(error, "No se pudo eliminar la caja de tesorería."),
    };
  }
}
