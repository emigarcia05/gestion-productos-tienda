"use client";

import { useMemo, useRef, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fmtPctEntero } from "@/lib/format";

export type PorcentajeEnteroMaskInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  /** Entero; `null` se trata como 0 en pantalla y edición. */
  value: number | null;
  onValueChange: (next: number) => void;
  /** Permite valores negativos (tecla `-` alterna signo). */
  signed?: boolean;
  min?: number;
  max?: number;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatUnsignedDisplay(n: number): string {
  return `${n.toLocaleString("es-AR")}%`;
}

function parsePastedInt(text: string, signed: boolean): number | null {
  const trimmed = text.replace(/%/g, "").trim();
  if (!trimmed) return 0;
  const negative = signed && trimmed.startsWith("-");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return signed && trimmed === "-" ? null : 0;
  const n = Number(digits);
  if (!Number.isSafeInteger(n)) return null;
  return negative ? -n : n;
}

/**
 * Porcentaje entero con `%` fijo al final (máscara tipo POS).
 * El cursor no queda después del `%`: Backspace/Delete siempre borran dígitos.
 */
export default function PorcentajeEnteroMaskInput({
  value,
  onValueChange,
  signed = false,
  min,
  max,
  className,
  disabled,
  onFocus,
  onBlur,
  onKeyDown,
  ...props
}: PorcentajeEnteroMaskInputProps) {
  const overwriteOnNextInputRef = useRef(true);
  const pendingNegativeRef = useRef(false);

  const effectiveMin = min ?? (signed ? -999_999 : 0);
  const effectiveMax = max ?? (signed ? 999_999 : 99);
  const intValue = value ?? 0;

  const display = useMemo(() => {
    if (signed) return fmtPctEntero(intValue);
    return formatUnsignedDisplay(intValue);
  }, [intValue, signed]);

  function applyValue(next: number) {
    onValueChange(clampInt(next, effectiveMin, effectiveMax));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={display}
      onFocus={(event) => {
        overwriteOnNextInputRef.current = true;
        pendingNegativeRef.current = false;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        overwriteOnNextInputRef.current = true;
        pendingNegativeRef.current = false;
        onBlur?.(event);
      }}
      onChange={() => {
        // Entrada solo por teclado / pegado (máscara POS).
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.ctrlKey || event.metaKey || event.altKey) {
          onKeyDown?.(event);
          return;
        }

        const key = event.key;
        const isDigit = /^[0-9]$/.test(key);
        const allowedControl =
          key === "ArrowLeft" ||
          key === "ArrowRight" ||
          key === "Tab" ||
          key === "Home" ||
          key === "End";

        if (key === "-" && signed) {
          event.preventDefault();
          if (overwriteOnNextInputRef.current && intValue === 0) {
            pendingNegativeRef.current = true;
            overwriteOnNextInputRef.current = false;
            return;
          }
          overwriteOnNextInputRef.current = false;
          pendingNegativeRef.current = false;
          if (intValue > 0) applyValue(-intValue);
          else if (intValue < 0) applyValue(Math.abs(intValue));
          return;
        }

        if (isDigit) {
          event.preventDefault();
          const digit = Number(key);
          const negative = pendingNegativeRef.current || intValue < 0;
          const base = overwriteOnNextInputRef.current ? 0 : Math.abs(intValue);
          let next = base * 10 + digit;
          if (negative) next = -next;
          pendingNegativeRef.current = false;
          overwriteOnNextInputRef.current = false;
          applyValue(next);
          return;
        }

        if (key === "Backspace" || key === "Delete") {
          event.preventDefault();
          pendingNegativeRef.current = false;
          overwriteOnNextInputRef.current = false;
          const abs = Math.floor(Math.abs(intValue) / 10);
          const next = intValue < 0 ? -abs : abs;
          applyValue(next);
          return;
        }

        if (allowedControl) {
          onKeyDown?.(event);
          return;
        }
        if (key === "Enter" || key === "Escape") {
          onKeyDown?.(event);
          return;
        }
        event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (disabled) return;
        overwriteOnNextInputRef.current = false;
        pendingNegativeRef.current = false;
        const parsed = parsePastedInt(event.clipboardData.getData("text"), signed);
        if (parsed === null) return;
        applyValue(parsed);
      }}
      className={cn("tabular-nums", className)}
      {...props}
    />
  );
}
