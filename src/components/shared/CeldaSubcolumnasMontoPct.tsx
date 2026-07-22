import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Par $ / % en subcolumnas 65 % / 35 % (una sola celda de tabla).
 *
 * Modelo (pads relativos al grupo, compensados por subcolumna):
 *   $ (65%): pl 10%·grupo → 15.3846% de la pista; pr 5%·grupo → 7.6923%
 *   % (35%): pl 5%·grupo  → 14.2857% de la pista; pr 10%·grupo → 28.5714%
 * Ritmo visual: [10%] valor$ [5%+5%] valor% [10%]
 *
 * El grid tiene ancho fijo (`--tabla-mc-forma-width`) y se centra en la celda,
 * para no degradarse si la columna de la tabla se ensancha.
 */
export const celdaSubcolumnasMontoPctVariants = cva(
  "tabla-mc-dual-grid tabular-nums",
  {
    variants: {
      density: {
        table: "h-full",
        default: "",
      },
    },
    defaultVariants: {
      density: "table",
    },
  }
);

export const celdaSubcolumnasMontoPctPesosVariants = cva(
  "tabla-mc-dual-pesos"
);

export const celdaSubcolumnasMontoPctPctVariants = cva("tabla-mc-dual-pct", {
  variants: {
    weight: {
      bold: "font-bold",
      normal: "font-normal",
    },
  },
  defaultVariants: {
    weight: "bold",
  },
});

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

/** Server Component (sin estado). */
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
