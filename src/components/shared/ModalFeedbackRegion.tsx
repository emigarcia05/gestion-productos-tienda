import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Contenedor del mensaje de estado bajo filtros en modales (éxito, error, carga).
 * Tokens de tema únicamente; sin paletas genéricas.
 */
const modalFeedbackRegionVariants = cva(
  "flex flex-col items-center justify-center gap-2 rounded-md border px-4 py-3 text-center",
  {
    variants: {
      surface: {
        muted: "border-border bg-muted/40",
        card: "border-border bg-card",
        tinted: "border-primary/20 bg-primary/5",
      },
      minHeight: {
        comfortable: "min-h-[5rem]",
        compact: "min-h-12",
        auto: "min-h-0",
      },
    },
    defaultVariants: {
      surface: "muted",
      minHeight: "comfortable",
    },
  }
);

export type ModalFeedbackRegionProps = {
  children: ReactNode;
  /**
   * Anuncios para lectores de pantalla: `polite` (default), `assertive` o sin live (`off`).
   */
  live?: "polite" | "assertive" | "off";
} & VariantProps<typeof modalFeedbackRegionVariants> &
  Omit<HTMLAttributes<HTMLDivElement>, "children">;

/**
 * Región accesible (`role="status"`) para feedback inline en modales (verificación, vacío, listo).
 */
export default function ModalFeedbackRegion({
  children,
  className,
  surface,
  minHeight,
  live = "polite",
  ...rest
}: ModalFeedbackRegionProps) {
  return (
    <div
      role="status"
      aria-live={live === "off" ? undefined : live}
      className={cn(modalFeedbackRegionVariants({ surface, minHeight }), className)}
      {...rest}
    >
      {children}
    </div>
  );
}
