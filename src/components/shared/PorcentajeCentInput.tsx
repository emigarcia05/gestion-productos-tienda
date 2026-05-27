"use client";

import { useMemo, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PORCENTAJE_CENT_MASK_MAX_CENTS,
  porcentajeCentCentsToNormalizedString,
  porcentajeCentNormalizedStringToCents,
  porcentajeCentNormalizedToDisplay,
} from "@/lib/porcentajeCentMask";

export type PorcentajeCentInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "onPaste"
> & {
  valueNormalized: string;
  onValueNormalizedChange: (next: string) => void;
};

/**
 * Input de porcentaje con máscara POS (2 decimales, es-AR).
 * Estado: string normalizado parseable (`"12.26"`). Vacío si el usuario borró todo.
 */
export default function PorcentajeCentInput({
  valueNormalized,
  onValueNormalizedChange,
  className,
  disabled,
  ...props
}: PorcentajeCentInputProps) {
  const centsValue = useMemo(
    () => porcentajeCentNormalizedStringToCents(valueNormalized),
    [valueNormalized]
  );

  const display = useMemo(() => {
    if (valueNormalized.trim() === "") return "";
    return porcentajeCentNormalizedToDisplay(valueNormalized);
  }, [valueNormalized]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={display}
      onChange={() => {
        // Entrada solo por teclado / pegado (máscara POS).
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
          const next = Math.min(centsValue * 10 + Number(key), PORCENTAJE_CENT_MASK_MAX_CENTS);
          onValueNormalizedChange(porcentajeCentCentsToNormalizedString(next));
          return;
        }

        if (key === "Backspace" || key === "Delete") {
          event.preventDefault();
          const next = Math.floor(centsValue / 10);
          onValueNormalizedChange(next === 0 ? "" : porcentajeCentCentsToNormalizedString(next));
          return;
        }

        if (allowedControl) return;
        event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (disabled) return;
        const digits = event.clipboardData.getData("text").replace(/\D/g, "");
        if (!digits) return;
        const pastedCents = Number(digits);
        if (!Number.isFinite(pastedCents)) return;
        const capped = Math.min(pastedCents, PORCENTAJE_CENT_MASK_MAX_CENTS);
        onValueNormalizedChange(capped === 0 ? "" : porcentajeCentCentsToNormalizedString(capped));
      }}
      className={cn("tabular-nums border-primary", className)}
      {...props}
    />
  );
}
