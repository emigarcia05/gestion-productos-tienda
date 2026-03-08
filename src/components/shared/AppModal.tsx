"use client";

import * as React from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Props del modal estándar de la app.
 * Layout wrapper: header corporativo + cuerpo en capas (gris → card blanca) + footer con botonera.
 */
export interface AppModalProps {
  /** Título del modal. Fuente Geist, blanco sobre fondo corporativo. Puede ser string o ReactNode (ej. título + indicador de pasos). */
  title: React.ReactNode;
  /** Contenido dinámico: formulario o datos. Se renderiza dentro de la card blanca centrada en el cuerpo. */
  children: React.ReactNode;
  /** Botonera del footer. Centrada verticalmente; acciones principales con bg #0072BB (primary) y texto blanco; cancelar con variant="outline" o "ghost". */
  actions: React.ReactNode;
  /** Clases adicionales del contenedor raíz (DialogContent). */
  className?: string;
  /** Clases adicionales del contenedor interno (card blanca del cuerpo). */
  bodyClassName?: string;
  /** Si se muestra el botón de cerrar (X). Por defecto true. */
  showCloseButton?: boolean;
}

/**
 * Modal estándar de la app (Layout Wrapper).
 *
 * Estructura:
 * - Header: fondo #0072BB (primary), texto blanco Geist centrado, sin bordes internos.
 * - Cuerpo: contenedor externo gris claro (app background); card interna blanca centrada con padding consistente.
 * - Footer: fondo gris claro (igual que contenedor externo del cuerpo), botones centrados verticalmente; primarios #0072BB con texto blanco.
 *
 * Uso: dentro de <Dialog open={open} onOpenChange={setOpen}>.
 */
export default function AppModal({
  title,
  children,
  actions,
  className,
  bodyClassName,
  showCloseButton = true,
}: AppModalProps) {
  return (
    <DialogContent
      className={cn(
        "app-modal grid grid-rows-[auto_minmax(0,1fr)_auto] gap-0 p-0 max-w-[calc(100%-2rem)] w-full sm:max-w-lg max-h-[90vh] bg-gris",
        "rounded-xl overflow-hidden outline-none border-0 shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] duration-200",
        className
      )}
      showCloseButton={showCloseButton}
    >
      {/* Header: fondo corporativo #0072BB, texto blanco Geist, centrado; sin bordes internos */}
      <DialogHeader className="shrink-0 bg-primary px-6 pt-5 pb-4 pr-12">
        <DialogTitle className="font-sans text-lg font-semibold text-primary-foreground tracking-tight w-full flex items-center justify-center gap-3 text-center">
          {title}
        </DialogTitle>
      </DialogHeader>

      {/* Cuerpo: scroll cuando el contenido es alto; header y footer siempre visibles */}
      <div className="min-h-0 flex flex-col bg-gris overflow-auto">
        <div className="min-h-0 flex items-stretch justify-center p-4 flex-1">
          <div
            className={cn(
              "app-modal__body w-full max-w-full bg-white rounded-lg p-6 shadow-sm min-h-0 overflow-auto",
              bodyClassName
            )}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Footer: mismo gris universal que cuerpo externo; botonera centrada verticalmente */}
      <div className="shrink-0 flex flex-row items-center justify-end gap-2 px-6 py-4 bg-gris">
        {actions}
      </div>
    </DialogContent>
  );
}
