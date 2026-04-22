import { prisma } from "@/lib/prisma";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import type { ServiceResult } from "@/types";
import type { CrearFinTesoreriaChequeInput } from "@/lib/validations/finTesoreriaCheques";

export interface FinTesoreriaChequeItem {
  id: string;
  cajaId: string;
  emisor: string;
  monto: number;
  fechaAcreditacionIso: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapCheque(row: {
  id: string;
  cajaId: string;
  emisor: string;
  monto: number;
  fechaAcreditacion: Date;
  createdAt: Date;
  updatedAt: Date;
}): FinTesoreriaChequeItem {
  return {
    id: row.id,
    cajaId: row.cajaId,
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
