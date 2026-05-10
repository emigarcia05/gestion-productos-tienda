import PosicionIvaBalanceClient from "@/components/finanzas/PosicionIvaBalanceClient";

interface Props {
  anio: number;
  esEditor: boolean;
  montosBrutosVentasConIvaPorMes: number[];
  ivaDebitoPorMes: number[];
  ivaCreditoPorMes: number[];
}

export default function FinanzasBalancePosicionIvaPage({
  anio,
  esEditor,
  montosBrutosVentasConIvaPorMes,
  ivaDebitoPorMes,
  ivaCreditoPorMes,
}: Props) {
  return (
    <PosicionIvaBalanceClient
      anio={anio}
      esEditor={esEditor}
      montosBrutosVentasConIvaPorMes={montosBrutosVentasConIvaPorMes}
      ivaDebitoPorMes={ivaDebitoPorMes}
      ivaCreditoPorMes={ivaCreditoPorMes}
    />
  );
}
