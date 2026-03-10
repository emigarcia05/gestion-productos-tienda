"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";
import { Dialog } from "@/components/ui/dialog";

const PASOS = [
  { titulo: "Paso 1", texto: 'Abrir el módulo "Importar Datos"', img: "/Importar Precios - Paso1.png" },
  { titulo: "Paso 2", texto: 'Iniciar "Nueva Importacion"', img: "/Importar Precios - Paso2.png" },
  { titulo: "Paso 3", texto: 'Seleccionar "Producto"', img: "/Importar Precios - Paso3.png" },
  { titulo: "Paso 4", texto: "Cargar el archivo descargado", img: "/Importar Precios - Paso4.png" },
  { titulo: "Paso 5", texto: "Seleccionar todos los ítems y guardar", img: "/Importar Precios - Paso5.png" },
] as const;

const IMG_SIZE = { width: 280, height: 180 };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportarCsvInstructorModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Instructivo: importar el archivo exportado"
        bodyClassName="max-w-4xl"
        actions={
          <Button type="button" onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground">
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground text-center">
            Después de guardar el .csv, seguí estos pasos para importar los datos en el sistema.
          </p>
          <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-4">
            {PASOS.map((paso, i) => (
              <div key={paso.titulo} className="flex items-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center text-center w-[200px] sm:w-[220px] shrink-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">{paso.titulo}</p>
                  <p className="text-sm text-foreground mb-3 min-h-[2.5rem]">{paso.texto}</p>
                  <div
                    className="w-full flex justify-center bg-muted/30 rounded-lg overflow-hidden"
                    style={{ minHeight: IMG_SIZE.height }}
                  >
                    <Image
                      src={paso.img}
                      alt={paso.texto}
                      width={IMG_SIZE.width}
                      height={IMG_SIZE.height}
                      className="object-contain w-full max-w-[200px] sm:max-w-[220px] h-[180px]"
                    />
                  </div>
                </div>
                {i < PASOS.length - 1 && (
                  <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground hidden sm:block" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
