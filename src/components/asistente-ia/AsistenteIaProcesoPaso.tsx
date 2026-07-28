"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AsistenteIaProcesoPasoProps {
  numero: number;
  titulo: string;
  /** Si false, el paso se ve deshabilitado y no recibe interacción. */
  activo: boolean;
  children: ReactNode;
  className?: string;
}

/** Card de un paso del proceso secuencial Asistente IA. */
export default function AsistenteIaProcesoPaso({
  numero,
  titulo,
  activo,
  children,
  className,
}: AsistenteIaProcesoPasoProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 rounded-lg border border-border bg-card p-4",
        !activo && "pointer-events-none opacity-50",
        className,
      )}
      aria-disabled={!activo}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {numero}. {titulo}
      </p>
      {children}
    </div>
  );
}
