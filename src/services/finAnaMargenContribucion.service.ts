import type { FinAnaCosFinaPago } from "@prisma/client";
import { cxTotalConIvaFinAnaCosFina, FIN_ANA_COS_FINA_PAGOS } from "@/lib/finAnaCosFina";
import {
  FIN_ANA_MC_FORMA_PAGO_EFECTIVO,
  type FormaPagoMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import { roundPorcentaje0a100 } from "@/lib/format";
import {
  ensureFinAnaCosFinaSeed,
  listarFinAnaCosFina,
  type FinAnaCosFinaItem,
} from "@/services/finAnaCosFina.service";
import { listarFinAnaCosFinaTerminales } from "@/services/finAnaCosFinaTerminal.service";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";

export type CxFinancieroPorFormaPago = Record<FormaPagoMargenContribucion, number>;

function promedioCxTotalConIva(filas: FinAnaCosFinaItem[]): number {
  if (filas.length === 0) return 0;
  const suma = filas.reduce(
    (acc, fila) =>
      acc +
      cxTotalConIvaFinAnaCosFina(
        fila.impCheque,
        fila.arancel,
        fila.costoFinanciero
      ),
    0
  );
  return roundPorcentaje0a100(suma / filas.length);
}

/**
 * CX FINANCIERO por forma de pago: **CX TOTAL C/ IVA** de Costos Financieros.
 * Si `terminalId` está definido, solo filas de esa terminal habilitadas; si no, promedio entre terminales habilitadas.
 */
export function mapCxFinancieroPorFormaPago(
  filas: FinAnaCosFinaItem[],
  terminalId?: string
): CxFinancieroPorFormaPago {
  const habilitadas = filas.filter(
    (fila) =>
      fila.habilitado && (terminalId == null || fila.terminalId === terminalId)
  );

  const map = {} as CxFinancieroPorFormaPago;

  for (const pago of FIN_ANA_COS_FINA_PAGOS) {
    const delPago = habilitadas.filter((fila) => fila.pago === pago);
    map[pago as FinAnaCosFinaPago] = promedioCxTotalConIva(delPago);
  }

  map[FIN_ANA_MC_FORMA_PAGO_EFECTIVO] = 0;

  return map;
}

export type DatosPaginaMargenContribucion = {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  cxFinancieroPorFormaPago: CxFinancieroPorFormaPago;
};

export async function getDatosPaginaMargenContribucion(): Promise<DatosPaginaMargenContribucion> {
  await ensureFinAnaCosFinaSeed();
  const [filasCostosFinancieros, terminales] = await Promise.all([
    listarFinAnaCosFina(),
    listarFinAnaCosFinaTerminales(),
  ]);

  return {
    filasCostosFinancieros,
    terminales,
    cxFinancieroPorFormaPago: mapCxFinancieroPorFormaPago(filasCostosFinancieros),
  };
}
