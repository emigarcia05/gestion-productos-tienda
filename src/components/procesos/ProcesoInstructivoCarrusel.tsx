"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PasoProcesoInstructivo } from "@/lib/procesos-instructivos";

interface Props {
  titulo: string;
  pasos: readonly PasoProcesoInstructivo[];
  /** Reinicia al paso 1 cuando cambia (p. ej. id del proceso seleccionado). */
  resetKey?: string;
  className?: string;
}

export default function ProcesoInstructivoCarrusel({
  titulo,
  pasos,
  resetKey,
  className,
}: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const paso = pasos[pasoActual];

  useEffect(() => {
    queueMicrotask(() => setPasoActual(0));
  }, [resetKey]);

  if (!paso || pasos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este proceso no tiene pasos configurados.
      </p>
    );
  }

  const irAtras = () => setPasoActual((p) => (p > 0 ? p - 1 : p));
  const irAdelante = () => setPasoActual((p) => (p < pasos.length - 1 ? p + 1 : p));

  return (
    <div className={cn("flex min-h-0 flex-col gap-4", className)}>
      <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
      <div className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center gap-4 overflow-hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative z-10 h-10 w-10 shrink-0 self-center rounded-full"
          onClick={irAtras}
          disabled={pasoActual === 0}
          aria-label="Paso Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-hidden text-center">
          <p className="mb-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-primary">
            {paso.titulo}
          </p>
          <p className="mb-2 shrink-0 text-sm text-foreground">{paso.texto}</p>
          <div className="relative z-0 flex aspect-video min-h-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/30">
            <Image
              src={paso.img}
              alt={paso.texto}
              fill
              className="object-contain object-center"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative z-10 h-10 w-10 shrink-0 self-center rounded-full"
          onClick={irAdelante}
          disabled={pasoActual === pasos.length - 1}
          aria-label="Paso Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {pasos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPasoActual(i)}
            aria-label={`Ir al paso ${i + 1}`}
            aria-current={pasoActual === i ? "step" : undefined}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
              pasoActual === i
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
