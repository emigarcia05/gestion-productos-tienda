"use client";

import { useMemo, useRef, type ClipboardEvent, type ComponentProps, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PX_LISTA_ENTERO_MASK_MAX,
  pxListaEnteroDigitsToNormalized,
  pxListaEnteroNormalizedToDigits,
  pxListaEnteroNormalizedToDisplay,
} from "@/lib/pxListaEnteroMask";

export type PxListaEnteroInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "onPaste"
> & {
  valueNormalized: string;
  onValueNormalizedChange: (next: string) => void;
  /** Se invoca al perder el foco del input (tras edición con máscara). */
  onCommit?: () => void;
};

/**
 * Input de precio entero (es-AR, miles `.`) con máscara POS.
 * Estado: string normalizado parseable (`"15000"`). Vacío si el usuario borró todo.
 */
export default function PxListaEnteroInput({
  valueNormalized,
  onValueNormalizedChange,
  onCommit,
  className,
  disabled,
  readOnly,
  ...props
}: PxListaEnteroInputProps) {
  const overwriteOnNextInputRef = useRef(true);

  const digitsValue = useMemo(
    () => pxListaEnteroNormalizedToDigits(valueNormalized),
    [valueNormalized]
  );

  const displayBody = useMemo(
    () => pxListaEnteroNormalizedToDisplay(valueNormalized),
    [valueNormalized]
  );

  function resetEditState() {
    overwriteOnNextInputRef.current = true;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled || readOnly) return;

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
      const base = overwriteOnNextInputRef.current ? 0 : digitsValue;
      const next = Math.min(base * 10 + Number(key), PX_LISTA_ENTERO_MASK_MAX);
      overwriteOnNextInputRef.current = false;
      onValueNormalizedChange(pxListaEnteroDigitsToNormalized(next));
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      overwriteOnNextInputRef.current = false;
      const next = Math.floor(digitsValue / 10);
      onValueNormalizedChange(pxListaEnteroDigitsToNormalized(next));
      return;
    }

    if (allowedControl) return;
    if (key === "Enter" || key === "Escape") return;
    event.preventDefault();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    if (disabled || readOnly) return;
    overwriteOnNextInputRef.current = false;
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    const pasted = Number(digits);
    if (!Number.isFinite(pasted)) return;
    const capped = Math.min(Math.trunc(pasted), PX_LISTA_ENTERO_MASK_MAX);
    onValueNormalizedChange(pxListaEnteroDigitsToNormalized(capped));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      readOnly={readOnly}
      value={displayBody}
      onFocus={() => {
        resetEditState();
      }}
      onBlur={() => {
        resetEditState();
        onCommit?.();
      }}
      onChange={() => {
        // Entrada solo por teclado / pegado (máscara POS).
      }}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={cn("tabular-nums border-primary", className)}
      {...props}
    />
  );
}
