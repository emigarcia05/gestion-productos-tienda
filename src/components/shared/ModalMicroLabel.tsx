import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Etiqueta visual compacta para campos y secciones dentro de modales (MAYÚSCULAS, tracking).
 * No sustituye un <label> asociado a control: usar dentro de <label> o junto a aria-labelledby.
 */
export const modalMicroLabelVariants = cva(
  "text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
  {
    variants: {
      align: {
        left: "w-full text-left leading-tight",
        center: "w-full text-center leading-tight",
      },
    },
    defaultVariants: {
      align: "left",
    },
  }
);

export type ModalMicroLabelProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof modalMicroLabelVariants>;

export default function ModalMicroLabel({
  className,
  align,
  ...props
}: ModalMicroLabelProps) {
  return (
    <span
      className={cn(modalMicroLabelVariants({ align }), className)}
      {...props}
    />
  );
}
