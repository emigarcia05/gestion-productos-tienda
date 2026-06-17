"use client";

import { useMemo, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

/** Parte editable del valor (sin `%`). */
function formatUnsignedEnteroBody(n: number): string {
  return n.toLocaleString("es-AR");
}

/** Parte editable con signo (sin `%`). */
function formatSignedEnteroBody(n: number): string {
  const entero = Math.round(n);
  if (entero > 0) return `+${entero.toLocaleString("es-AR")}`;
  if (entero < 0) return entero.toLocaleString("es-AR");
  return "0";
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
 * Porcentaje entero con `%` fijo como sufijo visual (no seleccionable).
 * Entrada tipo POS: Backspace/Delete borran dígitos sin depender del cursor.
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
  const [pendingNegative, setPendingNegative] = useState(false);

  const effectiveMin = min ?? (signed ? -999_999 : 0);
  const effectiveMax = max ?? (signed ? 999_999 : 99);
  const intValue = value ?? 0;

  const displayBody = useMemo(() => {
    if (signed && pendingNegative && intValue === 0) return "-";
    if (signed) return formatSignedEnteroBody(intValue);
    return formatUnsignedEnteroBody(intValue);
  }, [intValue, signed, pendingNegative]);

  function resetEditState() {
    overwriteOnNextInputRef.current = true;
    setPendingNegative(false);
  }

  function applyValue(next: number) {
    setPendingNegative(false);
    onValueChange(clampInt(next, effectiveMin, effectiveMax));
  }

  function isMinusKey(key: string): boolean {
    return key === "-" || key === "Subtract";
  }

  return (
    <div className="relative w-full min-w-0">
      <Input
        type="text"
        inputMode={signed ? "text" : "numeric"}
        autoComplete="off"
        disabled={disabled}
        value={displayBody}
        onFocus={(event) => {
          resetEditState();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          resetEditState();
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

          if (isMinusKey(key) && signed) {
            event.preventDefault();
            if (overwriteOnNextInputRef.current) {
              setPendingNegative((prev) => !prev);
              overwriteOnNextInputRef.current = false;
              return;
            }
            if (intValue > 0) applyValue(-intValue);
            else if (intValue < 0) applyValue(Math.abs(intValue));
            else setPendingNegative((prev) => !prev);
            return;
          }

          if (isDigit) {
            event.preventDefault();
            const digit = Number(key);
            const negative = overwriteOnNextInputRef.current
              ? pendingNegative
              : pendingNegative || intValue < 0;
            const base = overwriteOnNextInputRef.current ? 0 : Math.abs(intValue);
            let next = base * 10 + digit;
            if (negative) next = -next;
            overwriteOnNextInputRef.current = false;
            applyValue(next);
            return;
          }

          if (key === "Backspace" || key === "Delete") {
            event.preventDefault();
            overwriteOnNextInputRef.current = false;
            if (pendingNegative && intValue === 0) {
              setPendingNegative(false);
              return;
            }
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
          const parsed = parsePastedInt(event.clipboardData.getData("text"), signed);
          if (parsed === null) return;
          applyValue(parsed);
        }}
        className={cn("tabular-nums text-center pr-6", className)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none tabular-nums"
      >
        %
      </span>
    </div>
  );
}
