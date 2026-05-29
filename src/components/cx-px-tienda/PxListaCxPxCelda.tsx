"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";

const PX_LISTA_MAX_PESOS = 999_999_999;

function pesosDesdeDigitos(digits: string): number {
  const d = digits.replace(/\D/g, "");
  if (d === "") return 0;
  const n = parseInt(d, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(n, PX_LISTA_MAX_PESOS);
}

function digitosDesdePesos(pesos: number): string {
  if (!Number.isFinite(pesos) || pesos <= 0) return "";
  return String(Math.min(Math.trunc(pesos), PX_LISTA_MAX_PESOS));
}

export default function PxListaCxPxCelda({
  pesosCommit,
  puedeEditar,
  disabled,
  title,
  onCommit,
}: {
  pesosCommit: number;
  puedeEditar: boolean;
  disabled?: boolean;
  title?: string;
  onCommit: (pesos: number) => void;
}) {
  const [digits, setDigits] = useState(() => digitosDesdePesos(pesosCommit));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDigits(digitosDesdePesos(pesosCommit));
    }
  }, [pesosCommit, focused]);

  const pesosVista = pesosDesdeDigitos(digits);
  const displayCuerpo = fmtPrecio(pesosVista);

  if (!puedeEditar) {
    return (
      <span
        className="celda-numero tabular-nums text-center text-sm font-medium text-foreground min-w-0 block w-full"
        aria-label="Precio lista seleccionado"
        title={title}
      >
        ${displayCuerpo}
      </span>
    );
  }

  return (
    <div className="relative w-full min-w-0">
      <span
        className="pointer-events-none absolute left-1.5 top-1/2 z-[1] -translate-y-1/2 text-sm font-medium text-foreground tabular-nums"
        aria-hidden
      >
        $
      </span>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        title={title}
        aria-label="Precio lista"
        value={displayCuerpo}
        onFocus={() => {
          setFocused(true);
          setDigits(digitosDesdePesos(pesosCommit));
        }}
        onChange={(e) => {
          setDigits(e.target.value.replace(/\D/g, "").slice(0, 9));
        }}
        onBlur={() => {
          setFocused(false);
          const next = pesosDesdeDigitos(digits);
          setDigits(digitosDesdePesos(next));
          if (next > 0 && next !== Math.round(pesosCommit)) {
            onCommit(next);
          }
        }}
        className={cn(
          "input-filtro-unificado h-8 w-full min-w-0 pl-5 pr-2",
          "tabular-nums text-center text-sm font-medium",
          disabled && "pointer-events-none opacity-80"
        )}
      />
    </div>
  );
}
