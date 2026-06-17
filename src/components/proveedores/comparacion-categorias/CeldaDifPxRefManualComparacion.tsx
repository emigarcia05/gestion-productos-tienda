"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import PorcentajeEnteroMaskInput from "@/components/shared/PorcentajeEnteroMaskInput";
import { calcMargenManualDesdeDifPctReferencia } from "@/lib/calculos";
import {
  formatDifPxRefManualMask,
  roundMargenComparacionPct,
} from "@/lib/comparacionCategoriasFormat";
import { actualizarMargenManualComparacionAction } from "@/actions/comparacionCategorias";

interface Props {
  codExt: string;
  difPxRefManual: number | null;
  margenManualGuardado: number | null;
  costoCompra: number | null;
  pxVtaReferencia: number | null;
  puedeEditar: boolean;
  onDraftChange: (difPxRefManual: number | null) => void;
  onDraftEnd: () => void;
  onSaved: (margenManual: number | null) => void;
}

function valorEfectivoDifPxRef(difPxRefManual: number | null): number {
  return difPxRefManual ?? 0;
}

export default function CeldaDifPxRefManualComparacion({
  codExt,
  difPxRefManual,
  margenManualGuardado,
  costoCompra,
  pxVtaReferencia,
  puedeEditar,
  onDraftChange,
  onDraftEnd,
  onSaved,
}: Props) {
  const [localValue, setLocalValue] = useState(() => valorEfectivoDifPxRef(difPxRefManual));
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);

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

    const margenCalculado = calcMargenManualDesdeDifPctReferencia(
      parsed,
      pxVtaReferencia,
      costoCompra
    );
    const margenPersistir =
      margenCalculado != null ? roundMargenComparacionPct(margenCalculado) : null;
    const margenGuardadoRedondeado =
      margenManualGuardado != null ? roundMargenComparacionPct(margenManualGuardado) : null;

    if (margenPersistir === margenGuardadoRedondeado) {
      onDraftEnd();
      return;
    }

    setPending(true);
    try {
      const res = await actualizarMargenManualComparacionAction(codExt, margenPersistir);
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar DIF PX REF MANUAL.");
        setLocalValue(valorEfectivoDifPxRef(difPxRefManual));
        onDraftEnd();
        return;
      }
      onSaved(res.data?.margenManual ?? null);
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
      className="h-7 min-w-0 w-full max-w-[5.5rem] mx-auto text-center"
      aria-label="DIF PX REF MANUAL"
      title={formatDifPxRefManualMask(localValue)}
    />
  );
}
