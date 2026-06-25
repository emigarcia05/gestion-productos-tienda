/**
 * Cálculo de filas para **Flujo De Fondo** (`/finanzas/venc-por-fecha`).
 *
 * - Fila 1: **SALDO** = vencimientos acumulados (previos + del día) − **CAJA DISPONIBLE**.
 * - Filas 2+: **CAJA** fija según fila 1 (si saldo₁ > caja₁ → 0; si no → caja₁ − saldo₁).
 * - Filas 2+: **SALDO** = saldo anterior + vencimiento del día − caja.
 */

export interface FlujoDeFondoFilaEntrada {
  isoYmd: string;
  vencimientoDelDia: number;
}

export interface FilaFlujoDeFondoCalculada {
  isoYmd: string;
  vencimientoDelDia: number;
  cajaDisponible: number;
  saldo: number;
}

export interface CalcularFilasFlujoDeFondoParams {
  /** Suma de cajas de tesorería (y base de liquidez del primer día). */
  cajaDisponibleInicial: number;
  /** Pendiente vencido antes de hoy (compras + gastos). */
  saldoVencidoAntesDeHoy: number;
  /** Cheques diferidos acumulados hasta cada día (inclusive), por `isoYmd`. */
  liquidoChequesAcumuladoHasta?: Map<string, number>;
}

export function calcularFilasFlujoDeFondo(
  filasOrdenadas: FlujoDeFondoFilaEntrada[],
  params: CalcularFilasFlujoDeFondoParams
): FilaFlujoDeFondoCalculada[] {
  const { cajaDisponibleInicial, saldoVencidoAntesDeHoy, liquidoChequesAcumuladoHasta } = params;

  let vtosAcum = saldoVencidoAntesDeHoy;
  let saldoAnterior = 0;
  let cajaFilasSiguientes: number | null = null;

  return filasOrdenadas.map((fila, index) => {
    vtosAcum += fila.vencimientoDelDia;

    if (index === 0) {
      const chequesHasta = liquidoChequesAcumuladoHasta?.get(fila.isoYmd) ?? 0;
      const cajaDisponible = cajaDisponibleInicial + chequesHasta;
      const saldo = vtosAcum - cajaDisponible;
      cajaFilasSiguientes = saldo > cajaDisponible ? 0 : cajaDisponible - saldo;
      saldoAnterior = saldo;
      return {
        isoYmd: fila.isoYmd,
        vencimientoDelDia: fila.vencimientoDelDia,
        cajaDisponible,
        saldo,
      };
    }

    const cajaDisponible = cajaFilasSiguientes ?? 0;
    const saldo = saldoAnterior + fila.vencimientoDelDia - cajaDisponible;
    saldoAnterior = saldo;
    return {
      isoYmd: fila.isoYmd,
      vencimientoDelDia: fila.vencimientoDelDia,
      cajaDisponible,
      saldo,
    };
  });
}
