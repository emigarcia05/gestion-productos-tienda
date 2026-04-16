"use client";

import { useMemo, type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_CENTS = 99_999_999_999; // 999.999.999,99

function normalizedToCents(norm: string): number {
  if (norm.trim() === "") return 0;
  const n = Number(norm);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const cents = Math.round(n * 100);
  return Math.min(Math.max(cents, 0), MAX_CENTS);
}

function centsToNormalized(cents: number): string {
  const safe = Math.min(Math.max(Math.trunc(cents), 0), MAX_CENTS);
  const enteros = Math.floor(safe / 100);
  const decimales = safe % 100;
  if (decimales === 0) return String(enteros);
  return `${enteros}.${String(decimales).padStart(2, "0")}`;
}

function centsToDisplayAr(cents: number): string {
  const safe = Math.min(Math.max(Math.trunc(cents), 0), MAX_CENTS);
  const enteros = Math.floor(safe / 100);
  const decimales = safe % 100;
  const enterosFmt = enteros.toLocaleString("es-AR", {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  return `${enterosFmt},${String(decimales).padStart(2, "0")}`;
}

const montoArInputVariants = cva("", {
  variants: {
    variant: {
      totalPedido:
        "ml-0 h-9 w-full min-w-0 pl-0 pr-3 py-1 tabular-nums text-center font-semibold",
    },
  },
  defaultVariants: {
    variant: "totalPedido",
  },
});

export type MontoArInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onFocus" | "onBlur" | "onKeyDown" | "onPaste"
> &
  VariantProps<typeof montoArInputVariants> & {
    valueNormalized: string;
    onValueNormalizedChange: (next: string) => void;
  };

export default function MontoArInput({
  valueNormalized,
  onValueNormalizedChange,
  variant,
  className,
  disabled,
  ...props
}: MontoArInputProps) {
  const centsValue = useMemo(() => normalizedToCents(valueNormalized), [valueNormalized]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={centsToDisplayAr(centsValue)}
      onChange={() => {
        // Entrada controlada por teclado/paste en formato POS (centavos desplazables).
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
          const next = Math.min(centsValue * 10 + Number(key), MAX_CENTS);
          onValueNormalizedChange(centsToNormalized(next));
          return;
        }

        if (key === "Backspace" || key === "Delete") {
          event.preventDefault();
          const next = Math.floor(centsValue / 10);
          onValueNormalizedChange(centsToNormalized(next));
          return;
        }

        if (allowedControl) return;
        // Bloquea explícitamente separadores y cualquier otro caracter no permitido.
        event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        if (disabled) return;
        const text = event.clipboardData.getData("text");
        const digits = text.replace(/\D/g, "");
        if (!digits) return;
        const pastedCents = Number(digits);
        if (!Number.isFinite(pastedCents)) return;
        const next = Math.min(pastedCents, MAX_CENTS);
        onValueNormalizedChange(centsToNormalized(next));
      }}
      className={cn(montoArInputVariants({ variant }), className)}
      {...props}
    />
  );
}

