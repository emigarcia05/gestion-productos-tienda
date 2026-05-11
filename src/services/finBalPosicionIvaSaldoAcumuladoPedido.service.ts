import { mesAnioCalendarioArgentina } from "@/services/finBalGastoMensualBalance.service";
import { listarMontosBrutosFinBalIvaDebPorAnio } from "@/services/finBalIvaDeb.service";
import {
  sumarIvaCreditoPorMesAnio,
  ivaCreditoDesdeTotalConIva21,
} from "@/services/finBalPosicionIva.service";
import { listarSaldoManualPosicionIvaPorAnio } from "@/services/finBalPosicionIvaSaldoManual.service";

/** Inicio del acumulado «IVA SALDO» usado en `pxComparablePedidoUrgenteReposicion` (Pedido Urgente / reposición). */
const ACUM_PEDIDO_COMPARE_IVA_ANIO = 2026;
const ACUM_PEDIDO_COMPARE_IVA_MES = 4;

/**
 * Suma de «IVA SALDO» mensual (manual si existe en `fin_bal_posicion_iva_saldo_manual`;
 * si no, débito − crédito como en Posición IVA) desde abril 2026 inclusive hasta el mes
 * calendario actual en Argentina (inclusive). Meses futuros no entran.
 */
export async function sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido(): Promise<number> {
  try {
    const { mes: mesActual, anio: anioActual } = mesAnioCalendarioArgentina();
    let total = 0;

    for (let anio = ACUM_PEDIDO_COMPARE_IVA_ANIO; anio <= anioActual; anio++) {
      const mesInicio = anio === ACUM_PEDIDO_COMPARE_IVA_ANIO ? ACUM_PEDIDO_COMPARE_IVA_MES : 1;
      const mesFin = anio === anioActual ? mesActual : 12;
      if (mesInicio > mesFin) continue;

      const [brutosPorMes, creditoPorMes, manualPorMes] = await Promise.all([
        listarMontosBrutosFinBalIvaDebPorAnio(anio),
        sumarIvaCreditoPorMesAnio(anio),
        listarSaldoManualPosicionIvaPorAnio(anio),
      ]);

      for (let mes = mesInicio; mes <= mesFin; mes++) {
        const ix = mes - 1;
        const manual = manualPorMes[ix];
        const debito = ivaCreditoDesdeTotalConIva21(brutosPorMes[ix] ?? 0);
        const credito = creditoPorMes[ix] ?? 0;
        const calculado = debito - credito;
        const saldoMes = manual !== null ? manual : calculado;
        total += saldoMes;
      }
    }

    return total;
  } catch (e) {
    console.error("sumarIvaSaldoAcumuladoParaComparacionProveedoresPedido", e);
    return 0;
  }
}
