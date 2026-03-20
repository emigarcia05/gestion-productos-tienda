import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Contenedor del mensaje vacío (celda de tabla, bloque en modal, etc.). */
export const tableEmptyStateContainerVariants = cva(
  "text-muted-foreground text-center",
  {
    variants: {
      placement: {
        /** Celda única de tabla (listados principales). */
        tableCell: "py-8",
        /** Celda única con más aire (stock, reposición, tintométrico). */
        tableCellTall: "py-10",
        /** Modales y paneles con más aire vertical. */
        panel: "py-12",
        /** Mensajes auxiliares más densos (ej. sub-listas). */
        compact: "py-6",
        /**
         * Tabla bloqueada hasta seleccionar contexto (ej. sucursal).
         * Centrado en el viewport del contenedor con altura mínima.
         */
        blockedPanel:
          "flex h-full min-h-[200px] w-full items-center justify-center px-4",
      },
      textSize: {
        sm: "text-sm",
        xs: "text-xs",
      },
    },
    defaultVariants: {
      placement: "tableCell",
      textSize: "sm",
    },
  }
);

/** Texto del vacío: ancho máximo legible dentro de tablas anchas. */
export const tableEmptyStateMessageVariants = cva("inline-block px-4", {
  variants: {
    maxWidth: {
      readable: "max-w-md",
      full: "max-w-none",
    },
  },
  defaultVariants: {
    maxWidth: "readable",
  },
});

/**
 * Fila de estado en modales con lista/tabla: spinner + texto (o solo texto).
 * No importa `Table`; usar en `div` hermano de la grilla.
 */
export const modalListLoadingVariants = cva(
  "flex items-center justify-center text-muted-foreground text-sm gap-2",
  {
    variants: {
      padding: {
        panel: "py-12",
        compact: "py-8",
      },
    },
    defaultVariants: {
      padding: "panel",
    },
  }
);

export type TableEmptyStateProps = {
  message: ReactNode;
  className?: string;
  messageClassName?: string;
  /** Elemento raíz semántico (p. ej. `p` en listados que ya usan párrafo). */
  as?: "div" | "p";
} & VariantProps<typeof tableEmptyStateContainerVariants> &
  VariantProps<typeof tableEmptyStateMessageVariants>;

/**
 * Estado vacío reutilizable para tablas, modales y bloques de listado.
 * Mantiene tokens de tema y densidades alineadas con `EmptyTableRow` (ui/table).
 */
export function TableEmptyState({
  message,
  className,
  messageClassName,
  placement,
  textSize,
  maxWidth,
  as: Comp = "div",
}: TableEmptyStateProps) {
  return (
    <Comp
      className={cn(
        tableEmptyStateContainerVariants({ placement, textSize }),
        className
      )}
    >
      <span className={cn(tableEmptyStateMessageVariants({ maxWidth }), messageClassName)}>
        {message}
      </span>
    </Comp>
  );
}
