"use client";

import { useMemo, useRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MONTO_AR_MASK_MAX_CENTS,
  montoArCentsToDisplayBody,
  montoArCentsToNormalizedString,
  montoArNormalizedStringToCents,
} from "@/lib/montoArMask";

export type MontoArSaldoEnteroInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "onPaste"
> & {
  magnitudeNormalized: string;
  onMagnitudeNormalizedChange: (next: string) => void;
  negativo: boolean;
  onNegativoChange: (next: boolean) => void;
  treatEmptyNormalizedAsBlank?: boolean;
};

/** Máscara AR tipo POS para pesos enteros; admite signo menos con tecla `-`. */
export default function MontoArSaldoEnteroInput({
  magnitudeNormalized,
  onMagnitudeNormalizedChange,
  negativo,
  onNegativoChange,
  treatEmptyNormalizedAsBlank = true,
  className,
  disabled,
  ...props
}: MontoArSaldoEnteroInputProps) {
  const overwriteOnNextInputRef = useRef(true);
  const centsValue = useMemo(
    () => montoArNormalizedStringToCents(magnitudeNormalized),
    [magnitudeNormalized]
  );

  const display = useMemo(() => {
    if (treatEmptyNormalizedAsBlank && magnitudeNormalized.trim() === "") return "";
    const body = montoArCentsToDisplayBody(centsValue);
    return negativo ? `$-${body}` : `$${body}`;
  }, [centsValue, magnitudeNormalized, negativo, treatEmptyNormalizedAsBlank]);

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

        if (key === "-") {
          event.preventDefault();
          if (centsValue === 0 && magnitudeNormalized.trim() === "") return;
          onNegativoChange(!negativo);
          return;
        }

        if (isDigit) {
          event.preventDefault();
          const base = overwriteOnNextInputRef.current ? 0 : centsValue;
          const next = Math.min(base * 10 + Number(key), MONTO_AR_MASK_MAX_CENTS);
          overwriteOnNextInputRef.current = false;
          onMagnitudeNormalizedChange(montoArCentsToNormalizedString(next));
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
          onMagnitudeNormalizedChange(normalized);
          if (next === 0) onNegativoChange(false);
          return;
        }

        if (allowedControl) return;
        event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (disabled) return;
        overwriteOnNextInputRef.current = false;
        const text = event.clipboardData.getData("text").trim();
        const pasteNeg = text.startsWith("-");
        const digits = text.replace(/\D/g, "");
        if (!digits) return;
        const pastedCents = Number(digits);
        if (!Number.isFinite(pastedCents)) return;
        const next = Math.min(pastedCents, MONTO_AR_MASK_MAX_CENTS);
        onMagnitudeNormalizedChange(montoArCentsToNormalizedString(next));
        onNegativoChange(pasteNeg);
      }}
      className={cn("h-9 w-full min-w-0 px-3 py-1 tabular-nums text-center", className)}
      {...props}
    />
  );
}
