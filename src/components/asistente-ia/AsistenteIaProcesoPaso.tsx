"use client";

import ProcesoPaso, {
  type ProcesoPasoProps,
} from "@/components/shared/ProcesoPaso";

export type AsistenteIaProcesoPasoProps = ProcesoPasoProps;

/** Alias del card de paso secuencial (`ProcesoPaso`) para Asistente IA. */
export default function AsistenteIaProcesoPaso(props: AsistenteIaProcesoPasoProps) {
  return <ProcesoPaso {...props} />;
}
