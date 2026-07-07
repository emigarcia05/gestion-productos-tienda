"use client";

import { useMemo, useRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PORCENTAJE_CENT_MASK_MAX_CENTS,
  porcentajeCentCentsToNormalizedString,
  porcentajeCentNormalizedStringToCents,
  porcentajeCentNormalizedToDisplay,
  porcentajeCentNormalizedToDisplayWithPct,
} from "@/lib/porcentajeCentMask";

export type PorcentajeCentInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "onPaste"
> & {
  valueNormalized: string;
  onValueNormalizedChange: (next: string) => void;
  /** Se invoca al perder el foco del input (tras edición con máscara). */
  onCommit?: () => void;
  /** Si es `false`, el display no agrega sufijo `%` (solo `12,34`). Default `true`. */
  showPctSuffix?: boolean;
};

/**
 * Input de porcentaje con máscara POS (2 decimales, es-AR).
 * Estado: string normalizado parseable (`"12.26"`). Vacío si el usuario borró todo.
 * Al enfocar, el primer dígito reemplaza el valor previo; los siguientes desplazan (POS).
 */
export default function PorcentajeCentInput({
  valueNormalized,
  onValueNormalizedChange,
  onCommit,
  showPctSuffix = true,
  className,
  disabled,
  readOnly,
  ...props
}: PorcentajeCentInputProps) {
  const overwriteOnNextInputRef = useRef(true);

  const centsValue = useMemo(
    () => porcentajeCentNormalizedStringToCents(valueNormalized),
    [valueNormalized]
  );

  const display = useMemo(() => {
    if (valueNormalized.trim() === "") return "";
    return showPctSuffix
      ? porcentajeCentNormalizedToDisplayWithPct(valueNormalized)
      : porcentajeCentNormalizedToDisplay(valueNormalized);
  }, [showPctSuffix, valueNormalized]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      readOnly={readOnly}
      value={display}
      onFocus={() => {
        overwriteOnNextInputRef.current = true;
      }}
      onBlur={() => {
        overwriteOnNextInputRef.current = true;
        onCommit?.();
      }}
      onChange={() => {
        // Entrada solo por teclado / pegado (máscara POS).
      }}
      onKeyDown={(event) => {
        if (disabled || readOnly) return;
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
          const next = Math.min(base * 10 + Number(key), PORCENTAJE_CENT_MASK_MAX_CENTS);
          overwriteOnNextInputRef.current = false;
          onValueNormalizedChange(porcentajeCentCentsToNormalizedString(next));
          return;
        }

        if (key === "Backspace" || key === "Delete") {
          event.preventDefault();
          overwriteOnNextInputRef.current = false;
          const next = Math.floor(centsValue / 10);
          onValueNormalizedChange(porcentajeCentCentsToNormalizedString(next));
          return;
        }

        if (allowedControl) return;
        event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (disabled || readOnly) return;
        overwriteOnNextInputRef.current = false;
        const digits = event.clipboardData.getData("text").replace(/\D/g, "");
        if (!digits) return;
        const pastedCents = Number(digits);
        if (!Number.isFinite(pastedCents)) return;
        const capped = Math.min(pastedCents, PORCENTAJE_CENT_MASK_MAX_CENTS);
        onValueNormalizedChange(porcentajeCentCentsToNormalizedString(capped));
      }}
      className={cn("tabular-nums border-primary", className)}
      {...props}
    />
  );
}
