"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ProcesoPasoProps {
  numero: number;
  titulo: string;
  /** Si false, el paso se ve deshabilitado y no recibe interacción. */
  activo: boolean;
  children: ReactNode;
  className?: string;
}

/** Card de un paso de un flujo secuencial (Crear Envío, Asistente IA). */
export default function ProcesoPaso({
  numero,
  titulo,
  activo,
  children,
  className,
}: ProcesoPasoProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 shrink-0 flex-col gap-3 rounded-lg border border-border bg-card p-4",
        !activo && "pointer-events-none opacity-50",
        className,
      )}
      aria-disabled={!activo}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {numero}. {titulo}
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}
