import type { TipoCajaTesoreria } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types";
import { sumarMontosChequesAcreditadosHasta } from "@/services/finTesoreriaCheques.service";

export interface CajaTesoreriaItem {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: TipoCajaTesoreria;
  /** Valor persistido en `fin_tesoreria.monto` (para edición legacy; en CHEQUE no alimenta el disponible). */
  monto: number;
  /**
   * Monto que cuenta para totales y “caja disponible”: en `CHEQUE`, suma de `fin_tesoreria_cheques`
   * con `fecha_acreditacion` ≤ hoy (calendario Argentina); en otros tipos, igual a `monto`.
   */
  montoDisponible: number;
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

function mapCaja(
  row: {
    id: string;
    nombreCaja: string;
    titular: string;
    tipoCaja: TipoCajaTesoreria;
    monto: number;
    ultActualizacion: Date;
    createdAt: Date;
    updatedAt: Date;
  },
  montoDisponible: number
): CajaTesoreriaItem {
  return {
    id: row.id,
    nombreCaja: row.nombreCaja.toUpperCase(),
    titular: row.titular.toUpperCase(),
    tipoCaja: row.tipoCaja,
    monto: row.monto,
    montoDisponible,
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
    if (code === "P2002") return "Ya existe una caja con ese nombre y titular.";
    if (code === "P2025") return "Caja no encontrada.";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function listarCajasTesoreria(): Promise<CajaTesoreriaItem[]> {
  const rows = await prisma.cajaTesoreria.findMany({
    orderBy: [{ nombreCaja: "asc" }],
  });
  const hoyIso = dateToIsoYmdArgentina(new Date());
  const sumasCheque = await sumarMontosChequesAcreditadosHasta(hoyIso);
  return rows.map((row) => {
    const disponible =
      row.tipoCaja === "CHEQUE" ? (sumasCheque.get(row.id) ?? 0) : row.monto;
    return mapCaja(row, disponible);
  });
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
    return { success: true, data: mapCaja(row, row.tipoCaja === "CHEQUE" ? 0 : row.monto) };
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
    const existing = await prisma.cajaTesoreria.findUnique({
      where: { id: input.id },
      select: { tipoCaja: true },
    });
    if (!existing) {
      return { success: false, error: "Caja no encontrada." };
    }
    if (existing.tipoCaja === "CHEQUE" && input.tipoCaja !== "CHEQUE") {
      const n = await prisma.finTesoreriaCheque.count({ where: { cajaId: input.id } });
      if (n > 0) {
        return {
          success: false,
          error: "No se puede cambiar el tipo: la caja tiene cheques registrados.",
        };
      }
    }

    const row = await prisma.cajaTesoreria.update({
      where: { id: input.id },
      data: {
        nombreCaja: input.nombreCaja.trim().toUpperCase(),
        titular: input.titular.trim().toUpperCase(),
        tipoCaja: input.tipoCaja,
        monto: input.monto,
      },
    });
    const hoyIso = dateToIsoYmdArgentina(new Date());
    const sumasCheque = await sumarMontosChequesAcreditadosHasta(hoyIso);
    const disponible =
      row.tipoCaja === "CHEQUE" ? (sumasCheque.get(row.id) ?? 0) : row.monto;
    return { success: true, data: mapCaja(row, disponible) };
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
