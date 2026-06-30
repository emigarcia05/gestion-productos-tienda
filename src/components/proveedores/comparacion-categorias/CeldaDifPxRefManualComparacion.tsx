"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import PorcentajeEnteroMaskInput from "@/components/shared/PorcentajeEnteroMaskInput";
import { formatDifPxRefManualMask } from "@/lib/comparacionCategoriasFormat";
import { actualizarDifPxRefManualComparacionAction } from "@/actions/comparacionCategorias";
import { cn } from "@/lib/utils";

interface Props {
  codExt: string;
  difPxRefManual: number | null;
  difPxRefManualGuardado: number | null;
  puedeEditar: boolean;
  onDraftChange: (difPxRefManual: number | null) => void;
  onDraftEnd: () => void;
  onSaved: (difPxRefManual: number | null) => void;
}

function valorEfectivoDifPxRef(difPxRefManual: number | null): number {
  return difPxRefManual ?? 0;
}

function difSinCambio(
  guardado: number | null,
  parsed: number
): boolean {
  if (guardado === parsed) return true;
  return guardado === null && parsed === 0;
}

export default function CeldaDifPxRefManualComparacion({
  codExt,
  difPxRefManual,
  difPxRefManualGuardado,
  puedeEditar,
  onDraftChange,
  onDraftEnd,
  onSaved,
}: Props) {
  const [localValue, setLocalValue] = useState(() => valorEfectivoDifPxRef(difPxRefManual));
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);
  const tieneGuardado = difPxRefManualGuardado != null;

  useEffect(() => {
    if (!editando) {
      setLocalValue(valorEfectivoDifPxRef(difPxRefManual));
    }
  }, [difPxRefManual, editando]);

  async function commit() {
    const parsed = localValue;
    if (!Number.isSafeInteger(parsed)) {
      toast.error("Ingresá un porcentaje entero válido (positivo o negativo).");
      setLocalValue(valorEfectivoDifPxRef(difPxRefManual));
      onDraftEnd();
      return;
    }

    if (difSinCambio(difPxRefManualGuardado, parsed)) {
      onDraftEnd();
      setEditando(false);
      return;
    }

    setPending(true);
    try {
      const res = await actualizarDifPxRefManualComparacionAction(codExt, parsed);
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar DIF % REF. MAN.");
        setLocalValue(valorEfectivoDifPxRef(difPxRefManual));
        onDraftEnd();
        return;
      }
      onSaved(res.data?.difPxRefManual ?? null);
      onDraftEnd();
    } finally {
      setPending(false);
      setEditando(false);
    }
  }

  if (!puedeEditar) {
    return <CeldaDifPct pct={valorEfectivoDifPxRef(difPxRefManual)} />;
  }

  return (
    <PorcentajeEnteroMaskInput
      value={localValue}
      signed
      disabled={pending}
      onValueChange={(next) => {
        setEditando(true);
        setLocalValue(next);
        onDraftChange(next);
      }}
      onFocus={() => setEditando(true)}
      onBlur={() => void commit()}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
          setLocalValue(valorEfectivoDifPxRef(difPxRefManual));
          onDraftEnd();
          setEditando(false);
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "h-7 min-w-0 w-full max-w-[5.5rem] mx-auto text-center",
        tieneGuardado && "font-semibold"
      )}
      aria-label="DIF % REF. MAN."
      title={formatDifPxRefManualMask(localValue)}
    />
  );
}
