"use client";

import * as React from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface AppModalProps {
  /** Título del modal (fuente Geist vía layout). Puede ser string o ReactNode (ej. título + indicador de pasos). */
  title: React.ReactNode;
  /** Contenido dinámico: formulario o datos. Se renderiza dentro del cuerpo con fondo blanco. */
  children: React.ReactNode;
  /** Botonera del footer (ej. Cancelar + Guardar). Alineada a la derecha; usar Button variant="outline" o "ghost" para cancelar y variant="default" para acción principal (azul corporativo). */
  actions: React.ReactNode;
  /** Clases del contenedor (DialogContent). */
  className?: string;
  /** Clases del cuerpo central (caja blanca). */
  bodyClassName?: string;
  /** Ocultar el botón de cerrar (X). Default true. */
  showCloseButton?: boolean;
}

/**
 * Modal estándar de la app: fondo gris, header con título, cuerpo blanco (children), footer con acciones.
 * Layout wrapper basado en shadcn Dialog. Usar dentro de <Dialog open={open} onOpenChange={setOpen}>.
 * Acción principal: Button sin variant o variant="default" (azul corporativo --primary). Cancelar: variant="outline" o "ghost".
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
        "grid gap-0 p-0 max-w-[calc(100%-2rem)] w-full sm:max-w-lg",
        "bg-slate-50 border-2 border-primary rounded-xl overflow-hidden",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "fixed top-[50%] left-[50%] z-50 translate-x-[-50%] translate-y-[-50%] shadow-lg duration-200 outline-none",
        className
      )}
      showCloseButton={showCloseButton}
    >
      <DialogHeader className="shrink-0 px-6 pr-12 pt-6 pb-4">
        <DialogTitle className="font-sans text-lg font-semibold text-foreground tracking-tight flex items-center gap-3 w-full">
          {title}
        </DialogTitle>
      </DialogHeader>

      <div
        className={cn(
          "app-modal__body mx-6 mb-6 rounded-lg bg-white p-6 shadow-sm border border-border min-h-0 overflow-auto",
          bodyClassName
        )}
      >
        {children}
      </div>

      <div className="shrink-0 flex flex-row justify-end gap-2 px-6 pb-6 pt-0 bg-slate-50">
        {actions}
      </div>
    </DialogContent>
  );
}
