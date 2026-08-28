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
  /**
   * `arriba`: número + título sobre el contenido (default, Asistente IA).
   * `izquierda`: columna fija a la izquierda (NC DUX: ahorra alto).
   */
  tituloLado?: "arriba" | "izquierda";
}

/** Card de un paso de un flujo secuencial (Crear Envío, Asistente IA, NC DUX). */
export default function ProcesoPaso({
  numero,
  titulo,
  activo,
  children,
  className,
  tituloLado = "arriba",
}: ProcesoPasoProps) {
  const encabezado = (
    <div
      className={cn(
        tituloLado === "izquierda"
          ? "flex w-[8.5rem] shrink-0 flex-col gap-1"
          : undefined
      )}
    >
      {tituloLado === "izquierda" ? (
        <>
          <p className="text-sm font-semibold tabular-nums leading-none text-foreground">
            {numero}.
          </p>
          <p className="text-sm font-semibold uppercase tracking-wide leading-tight text-foreground">
            {titulo}
          </p>
        </>
      ) : (
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {numero}. {titulo}
        </p>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 gap-3 rounded-lg border border-border bg-card p-4",
        tituloLado === "izquierda"
          ? "flex-row items-stretch"
          : "shrink-0 flex-col",
        !activo && "pointer-events-none opacity-50",
        className
      )}
      aria-disabled={!activo}
    >
      {encabezado}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
