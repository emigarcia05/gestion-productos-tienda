"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PASOS = [
  { titulo: "Paso 1", texto: 'Abrir el módulo "Importar Datos"', img: "/Importar Precios - Paso1.png" },
  { titulo: "Paso 2", texto: 'Iniciar "Nueva Importacion"', img: "/Importar Precios - Paso2.png" },
  { titulo: "Paso 3", texto: 'Seleccionar "Producto"', img: "/Importar Precios - Paso3.png" },
  { titulo: "Paso 4", texto: "Cargar el archivo descargado", img: "/Importar Precios - Paso4.png" },
  { titulo: "Paso 5", texto: "Seleccionar todos los ítems y guardar", img: "/Importar Precios - Paso5.png" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportarCsvInstructorModal({ open, onOpenChange }: Props) {
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
          <Button type="button" onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground">
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-4 min-h-0 flex-1 flex">
          {/* Carrusel: flecha izq | contenido del paso | flecha der */}
          <div className="flex items-stretch justify-center gap-2 sm:gap-4 flex-1 min-h-0 min-w-0 overflow-hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full self-center relative z-10"
              onClick={irAtras}
              disabled={pasoActual === 0}
              aria-label="Paso anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col items-center text-center flex-1 min-w-0 min-h-0 overflow-hidden">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1 shrink-0">{paso.titulo}</p>
              <p className="text-sm text-foreground mb-2 shrink-0">{paso.texto}</p>
              <div className="w-full flex-1 min-h-0 aspect-video max-w-full flex justify-center items-center bg-muted/30 rounded-lg overflow-hidden relative z-0">
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
              className="shrink-0 h-10 w-10 rounded-full self-center relative z-10"
              onClick={irAdelante}
              disabled={pasoActual === PASOS.length - 1}
              aria-label="Paso Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Indicadores de paso (carrusel inferior) */}
          <div className="flex items-center justify-center gap-2 flex-wrap shrink-0 relative z-10">
            {PASOS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPasoActual(i)}
                aria-label={`Ir al paso ${i + 1}`}
                aria-current={pasoActual === i ? "step" : undefined}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors",
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
