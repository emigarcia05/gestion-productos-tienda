"use client";

import MensajeProceso from "@/components/shared/MensajeProceso";
import { useActCxDuxStatusPoll } from "@/hooks/useActCxDuxStatusPoll";

interface Props {
  pollEnabled: boolean;
}

export default function ActCxDuxProgresoBanner({ pollEnabled }: Props) {
  const { running, phase, processed, total } = useActCxDuxStatusPoll(pollEnabled);

  if (!running) return null;

  const mensaje =
    phase === "enviando" ? "ENVIANDO COSTOS DUX" : "ACTUALIZANDO COSTOS DUX";

  return (
    <MensajeProceso
      mensaje={mensaje}
      detalle={total > 0 ? { procesados: processed, total } : "…"}
      className="shrink-0"
    />
  );
}
