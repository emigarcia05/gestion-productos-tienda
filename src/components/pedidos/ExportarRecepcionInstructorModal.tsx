"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PASOS = [
  { titulo: "Paso 1", texto: "Abrir el módulo \"Importar Datos\".", img: "/importar_compra_1.png" },
  { titulo: "Paso 2", texto: "Iniciar \"Nueva Importacion\".", img: "/importar_compra_2.png" },
  { titulo: "Paso 3", texto: "Seleccionar \"Compra\".", img: "/importar_compra_3.png" },
  { titulo: "Paso 4", texto: "Cargar el archivo descargado.", img: "/importar_compra_4.png" },
  { titulo: "Paso 5", texto: "Seleccionar todos los ítems y guardar.", img: "/importar_compra_5.png" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportarRecepcionInstructorModal({ open, onOpenChange }: Props) {
  const [pasoActual, setPasoActual] = useState(0);
  const paso = PASOS[pasoActual];

  useEffect(() => {
    if (open) setPasoActual(0);
  }, [open]);

  const irAtras = () => setPasoActual((p) => (p > 0 ? p - 1 : p));
  const irAdelante = () => setPasoActual((p) => (p < PASOS.length - 1 ? p + 1 : p));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Instructivo: Importar El Archivo Exportado"
        className="sm:max-w-5xl"
        bodyClassName="max-w-full flex flex-col min-h-0"
        scrollBody={false}
        actions={
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground"
          >
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center gap-2 overflow-hidden sm:gap-4">
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
              <div className="relative z-0 flex min-h-0 w-full max-w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/30 aspect-video">
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
              disabled={pasoActual === PASOS.length - 1}
              aria-label="Paso Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-center gap-2">
            {PASOS.map((_, i) => (
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
      </AppModal>
    </Dialog>
  );
}
