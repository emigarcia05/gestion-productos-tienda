import PosicionIvaBalanceClient from "@/components/finanzas/PosicionIvaBalanceClient";

interface Props {
  anio: number;
  esEditor: boolean;
  ivaDebitoPorMes: number[];
  ivaCreditoPorMes: number[];
}

export default function FinanzasBalancePosicionIvaPage({
  anio,
  esEditor,
  ivaDebitoPorMes,
  ivaCreditoPorMes,
}: Props) {
  return (
    <PosicionIvaBalanceClient
      anio={anio}
      esEditor={esEditor}
      ivaDebitoPorMes={ivaDebitoPorMes}
      ivaCreditoPorMes={ivaCreditoPorMes}
    />
  );
}
