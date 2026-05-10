import PosicionIvaBalanceClient from "@/components/finanzas/PosicionIvaBalanceClient";

interface Props {
  anio: number;
  esEditor: boolean;
  ivaDebitoPorMes: number[];
  ivaCreditoPorMes: number[];
  saldoManualPorMes: (number | null)[];
}

export default function FinanzasBalancePosicionIvaPage({
  anio,
  esEditor,
  ivaDebitoPorMes,
  ivaCreditoPorMes,
  saldoManualPorMes,
}: Props) {
  return (
    <PosicionIvaBalanceClient
      anio={anio}
      esEditor={esEditor}
      ivaDebitoPorMes={ivaDebitoPorMes}
      ivaCreditoPorMes={ivaCreditoPorMes}
      saldoManualPorMes={saldoManualPorMes}
    />
  );
}
