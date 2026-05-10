import PosicionIvaBalanceClient from "@/components/finanzas/PosicionIvaBalanceClient";

interface Props {
  anio: number;
  ivaCreditoPorMes: number[];
}

export default function FinanzasBalancePosicionIvaPage({ anio, ivaCreditoPorMes }: Props) {
  return <PosicionIvaBalanceClient anio={anio} ivaCreditoPorMes={ivaCreditoPorMes} />;
}
