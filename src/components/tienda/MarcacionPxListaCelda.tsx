"use client";

import { useEffect, useState } from "react";
import {
  PX_LISTAS_MARCACION_DECIMALES,
  roundMarcacionPxLista,
} from "@/services/pxListasMarcacion.service";
import { cn } from "@/lib/utils";

const MARCACION_MAX = 999_999.99999;

function fmtMarcacionValor(m: number): string {
  return m.toLocaleString("es-AR", {
    minimumFractionDigits: PX_LISTAS_MARCACION_DECIMALES,
    maximumFractionDigits: PX_LISTAS_MARCACION_DECIMALES,
  });
}

/** Acepta dígitos con `,` o `.` como separador decimal. */
export function parseMarcacionPxListaInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === "." || normalized === "") {
    return null;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || n > MARCACION_MAX) return null;
  return roundMarcacionPxLista(n);
}

export default function MarcacionPxListaCelda({
  marcacionCommit,
  puedeEditar,
  disabled,
  shellClassName,
  onDraftChange,
  onDraftEnd,
  onCommit,
  persistirAlBlurConValorValido = false,
}: {
  marcacionCommit: number | null;
  puedeEditar: boolean;
  disabled?: boolean;
  shellClassName?: string;
  onDraftChange?: (marcacion: number) => void;
  onDraftEnd?: () => void;
  onCommit: (marcacion: number) => void;
  persistirAlBlurConValorValido?: boolean;
}) {
  const commitVal = marcacionCommit != null && marcacionCommit > 0 ? marcacionCommit : 0;
  const [texto, setTexto] = useState(() =>
    commitVal > 0 ? fmtMarcacionValor(commitVal) : ""
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setTexto(commitVal > 0 ? fmtMarcacionValor(commitVal) : "");
    }
  }, [commitVal, focused]);

  function emitDraft(raw: string) {
    const m = parseMarcacionPxListaInput(raw);
    if (m != null) onDraftChange?.(m);
  }

  if (!puedeEditar) {
    return (
      <span
        className="celda-numero tabular-nums text-center text-sm font-medium text-foreground min-w-0 inline-block w-full"
        aria-label="Marcación"
      >
        {commitVal > 0 ? fmtMarcacionValor(commitVal) : "—"}
      </span>
    );
  }

  return (
    <div
      className={cn(
        shellClassName,
        "px-lista-celda-shell flex items-center justify-center px-2"
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        aria-label="Marcación"
        value={texto}
        onFocus={() => {
          setFocused(true);
          const initial = commitVal > 0 ? fmtMarcacionValor(commitVal) : "";
          setTexto(initial);
          emitDraft(initial);
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d,.]/g, "");
          setTexto(next);
          emitDraft(next);
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseMarcacionPxListaInput(texto);
          if (
            parsed != null &&
            (persistirAlBlurConValorValido ||
              parsed !== roundMarcacionPxLista(commitVal))
          ) {
            setTexto(fmtMarcacionValor(parsed));
            onCommit(parsed);
          } else {
            setTexto(commitVal > 0 ? fmtMarcacionValor(commitVal) : "");
            onDraftEnd?.();
          }
        }}
        className={cn(
          "min-w-0 w-full border-0 bg-transparent p-0 h-auto min-h-0 shadow-none",
          "text-center text-sm font-medium tabular-nums leading-none text-foreground",
          "outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
          disabled && "pointer-events-none opacity-80"
        )}
      />
    </div>
  );
}
