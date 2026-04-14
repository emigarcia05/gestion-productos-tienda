import type { TipoCajaTesoreria } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";

export interface CajaTesoreriaItem {
  id: string;
  nombreCaja: string;
  tipoCaja: TipoCajaTesoreria;
  sucursalId: string;
  sucursalCodigo: string;
  sucursalNombre: string;
  monto: number;
  ultActualizacion: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearCajaTesoreriaInput {
  nombreCaja: string;
  tipoCaja: TipoCajaTesoreria;
  sucursalId: string;
  monto: number;
}

export interface EditarCajaTesoreriaInput extends CrearCajaTesoreriaInput {
  id: string;
}

function mapCaja(row: {
  id: string;
  nombreCaja: string;
  tipoCaja: TipoCajaTesoreria;
  sucursalId: string;
  monto: number;
  ultActualizacion: Date;
  createdAt: Date;
  updatedAt: Date;
  sucursal: { codigo: string; nombre: string };
}): CajaTesoreriaItem {
  return {
    id: row.id,
    nombreCaja: row.nombreCaja,
    tipoCaja: row.tipoCaja,
    sucursalId: row.sucursalId,
    sucursalCodigo: row.sucursal.codigo,
    sucursalNombre: row.sucursal.nombre,
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
    if (code === "P2003") return "La sucursal seleccionada no existe o no es válida.";
    if (code === "P2025") return "Caja no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarCajasTesoreria(): Promise<CajaTesoreriaItem[]> {
  const rows = await prisma.cajaTesoreria.findMany({
    orderBy: [{ nombreCaja: "asc" }],
    include: {
      sucursal: {
        select: { codigo: true, nombre: true },
      },
    },
  });
  return rows.map(mapCaja);
}

export async function crearCajaTesoreria(
  input: CrearCajaTesoreriaInput
): Promise<ServiceResult<CajaTesoreriaItem>> {
  try {
    const row = await prisma.cajaTesoreria.create({
      data: {
        nombreCaja: input.nombreCaja.trim(),
        tipoCaja: input.tipoCaja,
        sucursalId: input.sucursalId,
        monto: input.monto,
      },
      include: {
        sucursal: {
          select: { codigo: true, nombre: true },
        },
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
        nombreCaja: input.nombreCaja.trim(),
        tipoCaja: input.tipoCaja,
        sucursalId: input.sucursalId,
        monto: input.monto,
      },
      include: {
        sucursal: {
          select: { codigo: true, nombre: true },
        },
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
