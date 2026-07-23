"use client";

import { useMemo, useRef, type ClipboardEvent, type ComponentProps, type KeyboardEvent } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  /** Se invoca al perder el foco del input (tras edición con máscara). */
  onCommit?: () => void;
  /**
   * Si es `false`, input plano sin sufijo `%` (legacy / casos excepcionales).
   * Default `true`: `%` fijo a la derecha, no seleccionable (`.input-mascara-sufijo`).
   */
  showPctSuffix?: boolean;
  /**
   * Tope en centésimas de % (default 99,99 %). Px Listas: {@link MARGEN_PX_LISTA_MAX_CENTS}.
   */
  maxCents?: number;
  /**
   * Si es `true`, valor `0` / `0,00` se muestra vacío (útil en filtros con placeholder).
   */
  emptyWhenZero?: boolean;
  /**
   * Tacho dentro del contenedor, a la derecha del `%`. Solo visible si hay valor mostrado.
   */
  onClear?: () => void;
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
  maxCents = PORCENTAJE_CENT_MASK_MAX_CENTS,
  emptyWhenZero = false,
  onClear,
  className,
  disabled,
  readOnly,
  placeholder,
  ...props
}: PorcentajeCentInputProps) {
  const overwriteOnNextInputRef = useRef(true);

  const centsValue = useMemo(
    () => porcentajeCentNormalizedStringToCents(valueNormalized, maxCents),
    [valueNormalized, maxCents]
  );

  const displayBody = useMemo(() => {
    if (valueNormalized.trim() === "") return "";
    if (emptyWhenZero && centsValue === 0) return "";
    return porcentajeCentNormalizedToDisplay(valueNormalized, maxCents);
  }, [valueNormalized, maxCents, emptyWhenZero, centsValue]);

  const showPctVisual = showPctSuffix && (displayBody !== "" || !placeholder);
  const showClear = Boolean(onClear) && displayBody !== "" && !disabled;

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
      const base = overwriteOnNextInputRef.current ? 0 : centsValue;
      const next = Math.min(base * 10 + Number(key), maxCents);
      overwriteOnNextInputRef.current = false;
      onValueNormalizedChange(porcentajeCentCentsToNormalizedString(next, maxCents));
      return;
    }

    if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      overwriteOnNextInputRef.current = false;
      const next = Math.floor(centsValue / 10);
      onValueNormalizedChange(porcentajeCentCentsToNormalizedString(next, maxCents));
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
    const pastedCents = Number(digits);
    if (!Number.isFinite(pastedCents)) return;
    const capped = Math.min(pastedCents, maxCents);
    onValueNormalizedChange(porcentajeCentCentsToNormalizedString(capped, maxCents));
  }

  const inputClassName = cn(
    "min-h-0 min-w-0 flex-1 border-0 bg-transparent px-1 py-0 text-center text-sm tabular-nums shadow-none outline-none",
    "focus-visible:ring-0 focus-visible:outline-none",
    disabled && "cursor-not-allowed opacity-50",
    readOnly && "cursor-default"
  );

  if (!showPctSuffix) {
    return (
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        value={displayBody}
        placeholder={placeholder}
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

  return (
    <div
      className={cn(
        "input-mascara-sufijo flex w-full min-w-0 items-center rounded-md border border-primary bg-transparent",
        showClear && "input-mascara-sufijo--con-clear",
        className
      )}
    >
      <input
        type="text"
        data-slot="input"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        value={displayBody}
        placeholder={placeholder}
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
        className={inputClassName}
        {...props}
      />
      <span
        className={cn(
          "input-mascara-sufijo__pct tabular-nums",
          !showPctVisual && "invisible"
        )}
        aria-hidden
      >
        %
      </span>
      {showClear ? (
        <Button
          type="button"
          variant="primaryIcon"
          size="icon-lg"
          onClick={() => onClear?.()}
          className="filtro-individual-clear-btn input-mascara-sufijo__clear"
          aria-label="Limpiar este filtro"
          title="Limpiar este filtro"
          tabIndex={-1}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
