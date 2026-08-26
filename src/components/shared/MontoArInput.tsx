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
  montoArSignedCentsToDisplayWithCurrency,
  montoArSignedCentsToNormalizedString,
  montoArSignedNormalizedStringToCents,
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
    /** Tecla `-` / pegado con signo: persiste normalizado negativo (`"-123.45"`). */
    allowNegative?: boolean;
  };

export default function MontoArInput({
  valueNormalized,
  onValueNormalizedChange,
  treatEmptyNormalizedAsBlank = false,
  allowNegative = false,
  variant,
  className,
  disabled,
  ...props
}: MontoArInputProps) {
  const overwriteOnNextInputRef = useRef(true);
  const centsValue = useMemo(
    () =>
      allowNegative
        ? montoArSignedNormalizedStringToCents(valueNormalized)
        : montoArNormalizedStringToCents(valueNormalized),
    [allowNegative, valueNormalized]
  );

  const display = useMemo(() => {
    if (treatEmptyNormalizedAsBlank && valueNormalized.trim() === "") return "";
    return allowNegative
      ? montoArSignedCentsToDisplayWithCurrency(centsValue, "$")
      : montoArCentsToDisplayWithCurrency(centsValue, "$");
  }, [allowNegative, centsValue, treatEmptyNormalizedAsBlank, valueNormalized]);

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

        if (allowNegative && key === "-") {
          event.preventDefault();
          if (centsValue === 0 && valueNormalized.trim() === "") return;
          onValueNormalizedChange(montoArSignedCentsToNormalizedString(-centsValue));
          return;
        }

        if (isDigit) {
          event.preventDefault();
          const mag = Math.abs(centsValue);
          const base = overwriteOnNextInputRef.current ? 0 : mag;
          const nextMag = Math.min(base * 10 + Number(key), MONTO_AR_MASK_MAX_CENTS);
          overwriteOnNextInputRef.current = false;
          const keepNeg = allowNegative && centsValue < 0 && nextMag !== 0;
          const next = keepNeg ? -nextMag : nextMag;
          onValueNormalizedChange(
            allowNegative
              ? montoArSignedCentsToNormalizedString(next)
              : montoArCentsToNormalizedString(nextMag)
          );
          return;
        }

        if (key === "Backspace" || key === "Delete") {
          event.preventDefault();
          overwriteOnNextInputRef.current = false;
          const mag = Math.abs(centsValue);
          const nextMag = Math.floor(mag / 10);
          const keepNeg = allowNegative && centsValue < 0 && nextMag !== 0;
          const normalized =
            treatEmptyNormalizedAsBlank && nextMag === 0
              ? ""
              : allowNegative
                ? montoArSignedCentsToNormalizedString(keepNeg ? -nextMag : nextMag)
                : montoArCentsToNormalizedString(nextMag);
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
        const pasteNeg = allowNegative && text.trim().startsWith("-");
        const digits = text.replace(/\D/g, "");
        if (!digits) return;
        const pastedCents = Number(digits);
        if (!Number.isFinite(pastedCents)) return;
        const nextMag = Math.min(pastedCents, MONTO_AR_MASK_MAX_CENTS);
        const next = pasteNeg && nextMag !== 0 ? -nextMag : nextMag;
        onValueNormalizedChange(
          allowNegative
            ? montoArSignedCentsToNormalizedString(next)
            : montoArCentsToNormalizedString(nextMag)
        );
      }}
      className={cn(montoArInputVariants({ variant }), className)}
      {...props}
    />
  );
}
