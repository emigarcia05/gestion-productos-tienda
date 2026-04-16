"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function collapseDuplicateSeparators(s: string): string {
  return s.replace(/([.,])\1+/g, "$1");
}

/**
 * Normaliza input monetario AR a: "" | "123" | "123.45"
 * - Acepta `,` o `.` como separador decimal (se toma el que esté más a la derecha).
 * - El resto de separadores se consideran de miles y se ignoran.
 * - Máximo 2 cifras decimales.
 */
function parseMontoInputToNormalized(raw: string): string {
  let s = raw.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (s === "" || s === "$") return "";
  s = collapseDuplicateSeparators(s);

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const hasSep = lastComma !== -1 || lastDot !== -1;

  let integerRaw = "";
  let fracRaw = "";

  if (!hasSep) {
    integerRaw = s.replace(/\D/g, "");
    fracRaw = "";
  } else {
    const decPos = Math.max(lastComma, lastDot);
    integerRaw = s.slice(0, decPos).replace(/\D/g, "");
    fracRaw = s.slice(decPos + 1).replace(/\D/g, "").slice(0, 2);
  }

  if (integerRaw === "" && fracRaw === "") return "";
  if (fracRaw === "") return integerRaw === "" ? "0" : integerRaw;
  return `${integerRaw === "" ? "0" : integerRaw}.${fracRaw}`;
}

/** Monto AR: miles con punto, decimales con coma (ej. $1.234,56). Vacío → sin texto. */
function normalizedMontoToDisplayAr(norm: string): string {
  if (norm === "") return "";
  const n = Number(norm);
  if (!Number.isFinite(n) || n < 0) return "";
  const [ent, frac] = n.toFixed(2).split(".");
  const entFmt = Number(ent).toLocaleString("es-AR", {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  return `$${entFmt},${frac}`;
}

/**
 * Formatea en vivo mientras se escribe:
 * - Siempre muestra `$`.
 * - Acepta `,` o `.` como separador decimal (se toma el último).
 * - El separador visible siempre se muestra como `,` (formato AR).
 * - Máximo 2 decimales.
 */
function formatLiveMontoArInput(raw: string): string {
  let s = raw.replace(/\$/g, "").replace(/\s/g, "");
  if (s === "") return "$";
  s = collapseDuplicateSeparators(s);

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const hasSep = lastComma !== -1 || lastDot !== -1;

  let intDigits = "";
  let fracDigits = "";
  let trailingDecSep = false;

  if (!hasSep) {
    intDigits = s.replace(/\D/g, "");
    fracDigits = "";
    trailingDecSep = false;
  } else {
    const decPos = Math.max(lastComma, lastDot);
    trailingDecSep = decPos === s.length - 1;
    intDigits = s.slice(0, decPos).replace(/\D/g, "");
    fracDigits = s.slice(decPos + 1).replace(/\D/g, "").slice(0, 2);
  }

  if (intDigits === "" && fracDigits === "") {
    if (hasSep && trailingDecSep) return "$0,";
    return "$";
  }

  let intForFormat = intDigits === "" ? "0" : intDigits;
  if (intForFormat.length > 1) intForFormat = intForFormat.replace(/^0+/, "") || "0";

  const intShown = intForFormat.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!hasSep) return `$${intShown}`;
  if (trailingDecSep) return `$${intShown},`;
  return `$${intShown},${fracDigits}`;
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
  "value" | "onChange" | "onFocus" | "onBlur"
> &
  VariantProps<typeof montoArInputVariants> & {
    valueNormalized: string;
    onValueNormalizedChange: (next: string) => void;
    /**
     * Texto de entrada mientras está enfocado. Si no se pasa, el componente lo gestiona internamente.
     * Útil si querés preservarlo entre renders externos.
     */
    draftValue?: string;
    onDraftValueChange?: (next: string) => void;
  };

export default function MontoArInput({
  valueNormalized,
  onValueNormalizedChange,
  variant,
  className,
  draftValue,
  onDraftValueChange,
  disabled,
  ...props
}: MontoArInputProps) {
  const [focused, setFocused] = useState(false);
  const [draftInternal, setDraftInternal] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const draft = draftValue ?? draftInternal;
  const setDraft = onDraftValueChange ?? setDraftInternal;

  useEffect(() => {
    if (!focused) setDraftInternal("");
  }, [focused]);

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      value={focused ? draft : normalizedMontoToDisplayAr(valueNormalized)}
      onFocus={() => {
        setDraft(valueNormalized === "" ? "$" : normalizedMontoToDisplayAr(valueNormalized));
        setFocused(true);
      }}
      onChange={(e) => {
        if (!focused) return;
        setDraft(formatLiveMontoArInput(e.target.value));
      }}
      onBlur={() => {
        onValueNormalizedChange(parseMontoInputToNormalized(draft));
        setFocused(false);
      }}
      className={cn(montoArInputVariants({ variant }), className)}
      {...props}
    />
  );
}

