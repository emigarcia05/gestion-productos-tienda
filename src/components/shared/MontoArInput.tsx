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
 * - Usa `,` como separador decimal canónico (si existe en el texto).
 * - Los `.` se tratan como separadores de miles y se ignoran al normalizar.
 * - Máximo 2 cifras decimales.
 */
function parseMontoInputToNormalized(raw: string): string {
  let s = raw.replace(/\$/g, "").replace(/\s/g, "").trim();
  if (s === "" || s === "$") return "";
  s = collapseDuplicateSeparators(s);

  let integerRaw = "";
  let fracRaw = "";
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1) {
    // Con coma decimal: parte entera + hasta 2 decimales.
    integerRaw = s.slice(0, lastComma).replace(/\D/g, "");
    fracRaw = s.slice(lastComma + 1).replace(/\D/g, "").slice(0, 2);
  } else if (lastDot !== -1) {
    // Con punto y sin coma:
    // - Si hay 1-2 dígitos tras el punto, lo tratamos como decimal explícito del usuario.
    // - Si hay 3+ dígitos, lo tratamos como separador de miles (no decimal automático).
    const fracCandidate = s.slice(lastDot + 1).replace(/\D/g, "");
    if (fracCandidate.length > 0 && fracCandidate.length <= 2) {
      integerRaw = s.slice(0, lastDot).replace(/\D/g, "");
      fracRaw = fracCandidate.slice(0, 2);
    } else {
      integerRaw = s.replace(/\D/g, "");
    }
  } else {
    // Sin separador decimal explícito: todo se interpreta como parte entera.
    integerRaw = s.replace(/\D/g, "");
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
  const hasComma = lastComma !== -1;
  const hasDot = lastDot !== -1;
  const hasSep = hasComma || hasDot;

  let intDigits = "";
  let fracDigits = "";
  let trailingDecSep = false;

  if (!hasSep) {
    intDigits = s.replace(/\D/g, "");
    fracDigits = "";
    trailingDecSep = false;
  } else if (hasComma) {
    const decPos = lastComma;
    trailingDecSep = decPos === s.length - 1;
    intDigits = s.slice(0, decPos).replace(/\D/g, "");
    fracDigits = s.slice(decPos + 1).replace(/\D/g, "").slice(0, 2);
  } else {
    // Solo punto:
    // - 1-2 dígitos luego del punto => decimal explícito.
    // - 3+ dígitos => miles (sin crear decimales automáticos).
    const decPos = lastDot;
    const fracCandidate = s.slice(decPos + 1).replace(/\D/g, "");
    const shouldTreatDotAsDecimal = fracCandidate.length > 0 && fracCandidate.length <= 2;
    if (shouldTreatDotAsDecimal) {
      trailingDecSep = decPos === s.length - 1;
      intDigits = s.slice(0, decPos).replace(/\D/g, "");
      fracDigits = fracCandidate.slice(0, 2);
    } else {
      trailingDecSep = false;
      intDigits = s.replace(/\D/g, "");
      fracDigits = "";
    }
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

