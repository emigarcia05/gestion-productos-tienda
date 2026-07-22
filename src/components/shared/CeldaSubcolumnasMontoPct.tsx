import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Par $ / % como subcolumnas visuales 65 % / 35 % dentro de una celda de tabla.
 * Ritmo horizontal del grupo: pad | $ | gap | % | pad (pads exteriores = gap).
 * Los valores quedan centrados en su pista; `%` en negrita por defecto.
 */
export const celdaSubcolumnasMontoPctVariants = cva(
  "tabla-mc-dual-grid w-full min-w-0 tabular-nums",
  {
    variants: {
      density: {
        /** Alto de fila de `.tabla-gestion-compacta` (Margen Contribución). */
        table: "h-full",
        /** Uso fuera de tabla compacta. */
        default: "",
      },
    },
    defaultVariants: {
      density: "table",
    },
  }
);

export const celdaSubcolumnasMontoPctPesosVariants = cva(
  "tabla-mc-dual-pesos min-w-0 whitespace-nowrap text-center font-normal text-foreground"
);

export const celdaSubcolumnasMontoPctPctVariants = cva(
  "tabla-mc-dual-pct min-w-0 whitespace-nowrap text-center text-foreground",
  {
    variants: {
      weight: {
        bold: "font-bold",
        normal: "font-normal",
      },
    },
    defaultVariants: {
      weight: "bold",
    },
  }
);

export type CeldaSubcolumnasMontoPctProps = {
  /** Texto ya formateado del monto (ej. `$12.407`). */
  monto: string;
  /** Texto ya formateado del porcentaje (ej. `13%`). */
  pct: string;
  className?: string;
  montoClassName?: string;
  pctClassName?: string;
} & VariantProps<typeof celdaSubcolumnasMontoPctVariants> &
  VariantProps<typeof celdaSubcolumnasMontoPctPctVariants>;

/**
 * Server Component seguro (sin estado). Usar dentro de `TableCell` con el ancho del grupo.
 */
export default function CeldaSubcolumnasMontoPct({
  monto,
  pct,
  className,
  montoClassName,
  pctClassName,
  density,
  weight,
}: CeldaSubcolumnasMontoPctProps) {
  return (
    <div
      className={cn(celdaSubcolumnasMontoPctVariants({ density }), className)}
      role="group"
      aria-label={`${monto}, ${pct}`}
    >
      <span
        className={cn(
          celdaSubcolumnasMontoPctPesosVariants(),
          montoClassName
        )}
      >
        {monto}
      </span>
      <span
        className={cn(
          celdaSubcolumnasMontoPctPctVariants({ weight }),
          pctClassName
        )}
      >
        {pct}
      </span>
    </div>
  );
}
