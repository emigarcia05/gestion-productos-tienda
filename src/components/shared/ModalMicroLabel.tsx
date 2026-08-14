import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { MODAL_MICRO_LABEL_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Etiqueta visual compacta para campos y secciones dentro de modales (MAYÚSCULAS, tracking).
 * Color de fuente: `foreground` (negro de UI), no `muted`.
 * No sustituye un <label> asociado a control: usar dentro de <label> o junto a aria-labelledby.
 */
const modalMicroLabelVariants = cva(MODAL_MICRO_LABEL_CLASS, {
  variants: {
    align: {
      left: "w-full text-left leading-tight",
      center: "w-full text-center leading-tight",
    },
  },
  defaultVariants: {
    align: "left",
  },
});

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
