import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Par $ / % como subcolumnas visuales dentro de una celda.
 *
 * Ritmo del grupo (sobre el 100 % de la celda):
 *   10% pad | $ (65fr del resto) | 10% gap | % (35fr del resto) | 10% pad
 * → pads exteriores = gap; pistas de valor en proporción 65:35.
 *
 * Los valores se centran con flex en su pista (más fiable que text-align en spans).
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

/**
 * Server Component seguro (sin estado). Usar dentro de `TableCell` con ancho de columna anclado.
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
      <span className="tabla-mc-dual-pad" aria-hidden />
      <span
        className={cn(
          celdaSubcolumnasMontoPctPesosVariants(),
          montoClassName
        )}
      >
        {monto}
      </span>
      <span className="tabla-mc-dual-pad" aria-hidden />
      <span
        className={cn(
          celdaSubcolumnasMontoPctPctVariants({ weight }),
          pctClassName
        )}
      >
        {pct}
      </span>
      <span className="tabla-mc-dual-pad" aria-hidden />
    </div>
  );
}
