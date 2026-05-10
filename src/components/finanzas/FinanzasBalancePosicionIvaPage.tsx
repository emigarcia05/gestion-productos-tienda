import PosicionIvaBalanceClient from "@/components/finanzas/PosicionIvaBalanceClient";

interface Props {
  anio: number;
  /** Mes calendario actual (Argentina, 1–12) para ocultar saldo acumulado en meses futuros. */
  mesCalendarioActual: number;
  /** Año calendario actual (Argentina). */
  anioCalendarioActual: number;
  esEditor: boolean;
  ivaDebitoPorMes: number[];
  ivaCreditoPorMes: number[];
  saldoManualPorMes: (number | null)[];
}

export default function FinanzasBalancePosicionIvaPage({
  anio,
  mesCalendarioActual,
  anioCalendarioActual,
  esEditor,
  ivaDebitoPorMes,
  ivaCreditoPorMes,
  saldoManualPorMes,
}: Props) {
  return (
    <PosicionIvaBalanceClient
      anio={anio}
      mesCalendarioActual={mesCalendarioActual}
      anioCalendarioActual={anioCalendarioActual}
      esEditor={esEditor}
      ivaDebitoPorMes={ivaDebitoPorMes}
      ivaCreditoPorMes={ivaCreditoPorMes}
      saldoManualPorMes={saldoManualPorMes}
    />
  );
}
