"use client";

import { useMemo, useRef, type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MONTO_AR_MASK_MAX_CENTS,
  montoArCentsToNormalizedString,
  montoArCentsToDisplayWithCurrency,
  montoArNormalizedStringToCents,
} from "@/lib/montoArMask";

const montoArInputVariants = cva("", {
  variants: {
    variant: {
      /** Total pedido en pie de recepción (sin padding izquierdo). */
      totalPedido:
        "ml-0 h-9 w-full min-w-0 pl-0 pr-3 py-1 tabular-nums text-center font-semibold",
      /** Modales y formularios estándar. */
      form: "h-9 w-full min-w-0 px-3 py-1 tabular-nums text-center",
    },
  },
  defaultVariants: {
    variant: "form",
  },
});

export type MontoArInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "onPaste"
> &
  VariantProps<typeof montoArInputVariants> & {
    valueNormalized: string;
    onValueNormalizedChange: (next: string) => void;
    /**
     * Si es `true`, cuando `valueNormalized` es `""` el input se muestra vacío (no `$0,00`);
     * al borrar hasta 0 centavos se emite `""`. Default `false` (comportamiento histórico).
     */
    treatEmptyNormalizedAsBlank?: boolean;
  };

export default function MontoArInput({
  valueNormalized,
  onValueNormalizedChange,
  treatEmptyNormalizedAsBlank = false,
  variant,
  className,
  disabled,
  ...props
}: MontoArInputProps) {
  const overwriteOnNextInputRef = useRef(true);
  const centsValue = useMemo(() => montoArNormalizedStringToCents(valueNormalized), [valueNormalized]);

  const display = useMemo(() => {
    if (treatEmptyNormalizedAsBlank && valueNormalized.trim() === "") return "";
    return montoArCentsToDisplayWithCurrency(centsValue, "$");
  }, [centsValue, treatEmptyNormalizedAsBlank, valueNormalized]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={display}
      onFocus={() => {
        overwriteOnNextInputRef.current = true;
      }}
      onBlur={() => {
        overwriteOnNextInputRef.current = true;
      }}
      onChange={() => {
        // Entrada solo por teclado / pegado (máscara POS centavos).
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const key = event.key;
        const isDigit = /^[0-9]$/.test(key);
        const allowedControl =
          key === "Backspace" ||
          key === "Delete" ||
          key === "ArrowLeft" ||
          key === "ArrowRight" ||
          key === "Tab" ||
          key === "Home" ||
          key === "End";

        if (isDigit) {
          event.preventDefault();
          const base = overwriteOnNextInputRef.current ? 0 : centsValue;
          const next = Math.min(base * 10 + Number(key), MONTO_AR_MASK_MAX_CENTS);
          overwriteOnNextInputRef.current = false;
          onValueNormalizedChange(montoArCentsToNormalizedString(next));
          return;
        }

        if (key === "Backspace" || key === "Delete") {
          event.preventDefault();
          overwriteOnNextInputRef.current = false;
          const next = Math.floor(centsValue / 10);
          const normalized =
            treatEmptyNormalizedAsBlank && next === 0
              ? ""
              : montoArCentsToNormalizedString(next);
          onValueNormalizedChange(normalized);
          return;
        }

        if (allowedControl) return;
        event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (disabled) return;
        overwriteOnNextInputRef.current = false;
        const text = event.clipboardData.getData("text");
        const digits = text.replace(/\D/g, "");
        if (!digits) return;
        const pastedCents = Number(digits);
        if (!Number.isFinite(pastedCents)) return;
        const next = Math.min(pastedCents, MONTO_AR_MASK_MAX_CENTS);
        onValueNormalizedChange(montoArCentsToNormalizedString(next));
      }}
      className={cn(montoArInputVariants({ variant }), className)}
      {...props}
    />
  );
}
