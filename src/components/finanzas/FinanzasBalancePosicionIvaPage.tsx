import PosicionIvaBalanceClient from "@/components/finanzas/PosicionIvaBalanceClient";
import type { EstadoIvaComparacionPedido } from "@/actions/finBalPosicionIvaComparacionPedido";

interface Props {
  anio: number;
  esEditor: boolean;
  ivaDebitoPorMes: number[];
  ivaCreditoPorMes: number[];
  saldoManualPorMes: (number | null)[];
  comparacionPedidos: EstadoIvaComparacionPedido;
}

export default function FinanzasBalancePosicionIvaPage({
  anio,
  esEditor,
  ivaDebitoPorMes,
  ivaCreditoPorMes,
  saldoManualPorMes,
  comparacionPedidos,
}: Props) {
  return (
    <PosicionIvaBalanceClient
      anio={anio}
      esEditor={esEditor}
      ivaDebitoPorMes={ivaDebitoPorMes}
      ivaCreditoPorMes={ivaCreditoPorMes}
      saldoManualPorMes={saldoManualPorMes}
      comparacionPedidos={comparacionPedidos}
    />
  );
}
