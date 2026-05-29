"use client";

import { useEffect, useState } from "react";
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
  shellClassName,
  onDraftChange,
  onDraftEnd,
  onCommit,
}: {
  pesosCommit: number;
  puedeEditar: boolean;
  disabled?: boolean;
  title?: string;
  /** Recuadro (misma altura que Select DET PRECIO). */
  shellClassName?: string;
  /** Cada tecla: pesos enteros en borrador (marcación en vivo en la fila). */
  onDraftChange?: (pesos: number) => void;
  /** Al salir del campo sin persistir cambios. */
  onDraftEnd?: () => void;
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
  const displayPrecio = `$${displayCuerpo}`;

  function emitDraft(nextDigits: string) {
    onDraftChange?.(pesosDesdeDigitos(nextDigits));
  }

  if (!puedeEditar) {
    return (
      <span
        className="celda-numero tabular-nums text-center text-sm font-medium text-foreground min-w-0 inline-block w-full"
        aria-label="Precio lista seleccionado"
        title={title}
      >
        {displayPrecio}
      </span>
    );
  }

  return (
    <div
      className={cn(shellClassName, "px-lista-celda-shell flex items-center justify-center gap-0 px-2")}
      title={title}
    >
      <span
        className="shrink-0 text-sm font-medium text-foreground tabular-nums leading-none"
        aria-hidden
      >
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        aria-label="Precio lista"
        value={displayCuerpo}
        onFocus={() => {
          setFocused(true);
          const initial = digitosDesdePesos(pesosCommit);
          setDigits(initial);
          emitDraft(initial);
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 9);
          setDigits(next);
          emitDraft(next);
        }}
        onBlur={() => {
          setFocused(false);
          const next = pesosDesdeDigitos(digits);
          setDigits(digitosDesdePesos(next));
          if (next > 0 && next !== Math.round(pesosCommit)) {
            onCommit(next);
          } else {
            onDraftEnd?.();
          }
        }}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent p-0 h-auto min-h-0 shadow-none",
          "text-center text-sm font-medium tabular-nums leading-none text-foreground",
          "outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          disabled && "pointer-events-none opacity-80"
        )}
      />
    </div>
  );
}
