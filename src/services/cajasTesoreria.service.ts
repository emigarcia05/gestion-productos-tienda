import type { DisponibilidadCajaTesoreria, TipoCajaTesoreria, TipoValorTesoreria } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types";
import {
  sumarMontosChequesAcreditadosHasta,
  sumarMontosChequesDiferidosPorCaja,
} from "@/services/finTesoreriaCheques.service";
import { disponibilidadDesdeTipoCaja, tipoValorDesdeTipoCaja } from "@/lib/cajasTesoreriaTipos";

export interface CajaTesoreriaItem {
  id: string;
  nombreCaja: string;
  titular: string;
  tipoCaja: TipoCajaTesoreria;
  tipoValor: TipoValorTesoreria;
  disponibilidad: DisponibilidadCajaTesoreria;
  /** Valor persistido en `fin_tesoreria.monto` (para edición legacy; en CHEQUE no alimenta el disponible). */
  monto: number;
  /**
   * Monto que cuenta para totales y “caja disponible”: en `CHEQUE`, suma de `fin_tesoreria_cheques`
   * con `fecha_acreditacion` ≤ hoy (calendario Argentina); en otros tipos, igual a `monto`.
   */
  montoDisponible: number;
  /**
   * Solo `CHEQUE`: suma de cheques con `fecha_acreditacion` > hoy (diferidos). En otros tipos, `0`.
   */
  montoChequesDiferidos: number;
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
    tipoValor: TipoValorTesoreria;
    disponibilidad: DisponibilidadCajaTesoreria;
    monto: number;
    ultActualizacion: Date;
    createdAt: Date;
    updatedAt: Date;
  },
  montoDisponible: number,
  montoChequesDiferidos: number
): CajaTesoreriaItem {
  return {
    id: row.id,
    nombreCaja: row.nombreCaja.toUpperCase(),
    titular: row.titular.toUpperCase(),
    tipoCaja: row.tipoCaja,
    tipoValor: row.tipoValor,
    disponibilidad: row.disponibilidad,
    monto: row.monto,
    montoDisponible,
    montoChequesDiferidos,
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
  const [sumasCheque, sumasDiferido] = await Promise.all([
    sumarMontosChequesAcreditadosHasta(hoyIso),
    sumarMontosChequesDiferidosPorCaja(hoyIso),
  ]);
  return rows.map((row) => {
    const disponible =
      row.tipoCaja === "CHEQUE" ? (sumasCheque.get(row.id) ?? 0) : row.monto;
    const diferido =
      row.tipoCaja === "CHEQUE" ? (sumasDiferido.get(row.id) ?? 0) : 0;
    return mapCaja(row, disponible, diferido);
  });
}

/** Cajas con un `tipo_valor` dado (ej. **DIGITAL** = banco o billetera digital; destino de acreditación de cheques). */
export async function listarCajasTesoreriaPorTipoValor(
  tipoValor: TipoValorTesoreria
): Promise<CajaTesoreriaItem[]> {
  const rows = await prisma.cajaTesoreria.findMany({
    where: { tipoValor },
    orderBy: [{ nombreCaja: "asc" }],
  });
  const hoyIso = dateToIsoYmdArgentina(new Date());
  const [sumasCheque, sumasDiferido] = await Promise.all([
    sumarMontosChequesAcreditadosHasta(hoyIso),
    sumarMontosChequesDiferidosPorCaja(hoyIso),
  ]);
  return rows.map((row) => {
    const disponible =
      row.tipoCaja === "CHEQUE" ? (sumasCheque.get(row.id) ?? 0) : row.monto;
    const diferido =
      row.tipoCaja === "CHEQUE" ? (sumasDiferido.get(row.id) ?? 0) : 0;
    return mapCaja(row, disponible, diferido);
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
        tipoValor: tipoValorDesdeTipoCaja(input.tipoCaja),
        disponibilidad: disponibilidadDesdeTipoCaja(input.tipoCaja),
        monto: input.monto,
      },
    });
    return {
      success: true,
      data: mapCaja(row, row.tipoCaja === "CHEQUE" ? 0 : row.monto, 0),
    };
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
        tipoValor: tipoValorDesdeTipoCaja(input.tipoCaja),
        disponibilidad: disponibilidadDesdeTipoCaja(input.tipoCaja),
        monto: input.monto,
      },
    });
    const hoyIso = dateToIsoYmdArgentina(new Date());
    const [sumasCheque, sumasDiferido] = await Promise.all([
      sumarMontosChequesAcreditadosHasta(hoyIso),
      sumarMontosChequesDiferidosPorCaja(hoyIso),
    ]);
    const disponible =
      row.tipoCaja === "CHEQUE" ? (sumasCheque.get(row.id) ?? 0) : row.monto;
    const diferido =
      row.tipoCaja === "CHEQUE" ? (sumasDiferido.get(row.id) ?? 0) : 0;
    return { success: true, data: mapCaja(row, disponible, diferido) };
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
