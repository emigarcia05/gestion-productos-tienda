import type { TipoChequeTesoreria } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types";
import type {
  ActualizarFinTesoreriaChequeInput,
  CrearFinTesoreriaChequeInput,
  TransferirFinTesoreriaChequeInput,
} from "@/lib/validations/finTesoreriaCheques";

/** Límite alineado con `montoCajaTesoreriaSchema` (cajas tesorería). */
const MONTO_CAJA_MAX = 999_999_999;
const MONTO_CAJA_MIN = -999_999_999;

export interface TransferirChequeFinTesoreriaResultado {
  chequeId: string;
  cajaOrigenId: string;
  cajaDestinoId: string;
  monto: number;
  montoDestinoTrasTransferencia: number;
}

export interface FinTesoreriaChequeItem {
  id: string;
  cajaId: string;
  tipo: TipoChequeTesoreria;
  tenedor: string;
  emisor: string;
  monto: number;
  fechaAcreditacionIso: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapCheque(row: {
  id: string;
  cajaId: string;
  tipo: TipoChequeTesoreria;
  tenedor: string;
  emisor: string;
  monto: number;
  fechaAcreditacion: Date;
  createdAt: Date;
  updatedAt: Date;
}): FinTesoreriaChequeItem {
  return {
    id: row.id,
    cajaId: row.cajaId,
    tipo: row.tipo,
    tenedor: row.tenedor,
    emisor: row.emisor,
    monto: row.monto,
    fechaAcreditacionIso: dateToIsoYmdArgentina(row.fechaAcreditacion),
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
    if (code === "P2003") return "Caja inválida.";
  }
  return error instanceof Error ? error.message : fallback;
}

/** Suma `monto` por caja con `fecha_acreditacion` <= `hoyIso` (comparación en DATE). */
export async function sumarMontosChequesAcreditadosHasta(
  hoyIso: string
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ caja_id: string; suma: bigint }>>`
    SELECT "caja_id", COALESCE(SUM("monto"), 0)::bigint AS suma
    FROM "fin_tesoreria_cheques"
    WHERE "fecha_acreditacion" <= ${hoyIso}::date
    GROUP BY "caja_id"
  `;
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.caja_id, Number(r.suma));
  }
  return map;
}

/** Suma `monto` por caja con `fecha_acreditacion` > `hoyIso` (cheques diferidos; comparación en DATE). */
export async function sumarMontosChequesDiferidosPorCaja(
  hoyIso: string
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ caja_id: string; suma: bigint }>>`
    SELECT "caja_id", COALESCE(SUM("monto"), 0)::bigint AS suma
    FROM "fin_tesoreria_cheques"
    WHERE "fecha_acreditacion" > ${hoyIso}::date
    GROUP BY "caja_id"
  `;
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.caja_id, Number(r.suma));
  }
  return map;
}

/**
 * Por cada fecha de acreditación **posterior** a `hoyIso`, suma de montos que ingresan a “caja líquida” ese día (calendario Argentina).
 * Usado en Flujo de fondo para proyectar disponibilidad cuando vence la fecha del cheque.
 */
export async function sumarMontosChequesDiferidosPorFechaAcreditacion(
  hoyIso: string
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ fecha: string; suma: bigint }>>`
    SELECT to_char("fecha_acreditacion", 'YYYY-MM-DD') AS fecha,
           COALESCE(SUM("monto"), 0)::bigint AS suma
    FROM "fin_tesoreria_cheques"
    WHERE "fecha_acreditacion" > ${hoyIso}::date
    GROUP BY "fecha_acreditacion"
  `;
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.fecha, Number(r.suma));
  }
  return map;
}

export async function listarChequesPorCajaId(cajaId: string): Promise<FinTesoreriaChequeItem[]> {
  const rows = await prisma.finTesoreriaCheque.findMany({
    where: { cajaId },
    orderBy: [{ fechaAcreditacion: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapCheque);
}

export async function crearFinTesoreriaCheque(
  input: CrearFinTesoreriaChequeInput
): Promise<ServiceResult<FinTesoreriaChequeItem>> {
  const caja = await prisma.cajaTesoreria.findUnique({
    where: { id: input.cajaId },
    select: { id: true, tipoCaja: true },
  });
  if (!caja) {
    return { success: false, error: "Caja no encontrada." };
  }
  if (caja.tipoCaja !== "CHEQUE") {
    return { success: false, error: "Solo se pueden registrar cheques en cajas tipo CHEQUE." };
  }

  try {
    const row = await prisma.finTesoreriaCheque.create({
      data: {
        cajaId: input.cajaId,
        tipo: input.tipo,
        tenedor: input.tenedor,
        emisor: input.emisor.trim(),
        monto: input.monto,
        fechaAcreditacion: new Date(`${input.fechaAcreditacion}T12:00:00.000Z`),
      },
    });
    return { success: true, data: mapCheque(row) };
  } catch (error: unknown) {
    const msg = mapDbError(error, "No se pudo registrar el cheque.");
    if (typeof error === "object" && error !== null && "message" in error) {
      const m = String((error as { message: unknown }).message);
      if (m.includes("fin_tesoreria_cheques:")) {
        return { success: false, error: "La caja debe ser de tipo CHEQUE." };
      }
    }
    return { success: false, error: msg };
  }
}

export async function actualizarFinTesoreriaCheque(
  input: ActualizarFinTesoreriaChequeInput
): Promise<ServiceResult<FinTesoreriaChequeItem>> {
  const existente = await prisma.finTesoreriaCheque.findUnique({
    where: { id: input.id },
    include: { caja: { select: { tipoCaja: true } } },
  });
  if (!existente) {
    return { success: false, error: "Cheque no encontrado." };
  }
  if (existente.caja.tipoCaja !== "CHEQUE") {
    return { success: false, error: "Solo se pueden editar cheques de cajas tipo CHEQUE." };
  }

  try {
    const row = await prisma.finTesoreriaCheque.update({
      where: { id: input.id },
      data: {
        tipo: input.tipo,
        tenedor: input.tenedor,
        emisor: input.emisor.trim(),
        monto: input.monto,
        fechaAcreditacion: new Date(`${input.fechaAcreditacion}T12:00:00.000Z`),
      },
    });
    return { success: true, data: mapCheque(row) };
  } catch (error: unknown) {
    return { success: false, error: mapDbError(error, "No se pudo actualizar el cheque.") };
  }
}

/**
 * Transfiere el importe del cheque a otra caja (`fin_tesoreria.monto`) y elimina el registro del cheque.
 * Requiere `fecha_acreditacion` ≤ hoy (calendario Argentina).
 */
export async function transferirChequeFinTesoreria(
  input: TransferirFinTesoreriaChequeInput
): Promise<ServiceResult<TransferirChequeFinTesoreriaResultado>> {
  const hoyIso = dateToIsoYmdArgentina(new Date());

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const cheque = await tx.finTesoreriaCheque.findUnique({
        where: { id: input.chequeId },
      });
      if (!cheque) {
        throw new Error("CHEQUE_NOT_FOUND");
      }

      const fechaChequeIso = dateToIsoYmdArgentina(cheque.fechaAcreditacion);
      if (fechaChequeIso > hoyIso) {
        throw new Error("CHEQUE_NO_ACREDITADO");
      }

      if (cheque.cajaId === input.cajaDestinoId) {
        throw new Error("DESTINO_IGUAL_ORIGEN");
      }

      const destino = await tx.cajaTesoreria.findUnique({
        where: { id: input.cajaDestinoId },
      });
      if (!destino) {
        throw new Error("DESTINO_NOT_FOUND");
      }
      if (destino.tipoCaja !== "DIGITAL") {
        throw new Error("DESTINO_NO_DIGITAL");
      }

      const nuevoSaldo = destino.monto + cheque.monto;
      if (nuevoSaldo > MONTO_CAJA_MAX || nuevoSaldo < MONTO_CAJA_MIN) {
        throw new Error("SALDO_DESTINO_FUERA_DE_RANGO");
      }

      await tx.cajaTesoreria.update({
        where: { id: input.cajaDestinoId },
        data: { monto: { increment: cheque.monto } },
      });

      await tx.finTesoreriaCheque.delete({ where: { id: cheque.id } });

      return {
        chequeId: cheque.id,
        cajaOrigenId: cheque.cajaId,
        cajaDestinoId: input.cajaDestinoId,
        monto: cheque.monto,
        montoDestinoTrasTransferencia: nuevoSaldo,
      };
    });

    return { success: true, data: resultado };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "CHEQUE_NOT_FOUND") {
        return { success: false, error: "Cheque no encontrado." };
      }
      if (error.message === "CHEQUE_NO_ACREDITADO") {
        return {
          success: false,
          error:
            "No se puede transferir: la fecha de acreditación del cheque es posterior a hoy.",
        };
      }
      if (error.message === "DESTINO_IGUAL_ORIGEN") {
        return {
          success: false,
          error: "La caja destino debe ser distinta de la caja donde está el cheque.",
        };
      }
      if (error.message === "DESTINO_NOT_FOUND") {
        return { success: false, error: "Caja destino no encontrada." };
      }
      if (error.message === "DESTINO_NO_DIGITAL") {
        return {
          success: false,
          error: "La acreditación solo puede hacerse hacia una caja tipo DIGITAL.",
        };
      }
      if (error.message === "SALDO_DESTINO_FUERA_DE_RANGO") {
        return {
          success: false,
          error: "El saldo de la caja destino superaría el máximo permitido.",
        };
      }
    }
    return {
      success: false,
      error: mapDbError(error, "No se pudo transferir el cheque."),
    };
  }
}

export async function eliminarFinTesoreriaCheque(id: string): Promise<ServiceResult<void>> {
  try {
    await prisma.finTesoreriaCheque.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return { success: false, error: "Cheque no encontrado." };
    }
    return { success: false, error: mapDbError(error, "No se pudo eliminar el cheque.") };
  }
}
