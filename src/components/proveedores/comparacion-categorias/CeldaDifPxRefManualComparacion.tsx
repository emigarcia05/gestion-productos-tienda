"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import CeldaDifPct from "@/components/shared/CeldaDifPct";
import { calcMargenManualDesdeDifPctReferencia } from "@/lib/calculos";
import {
  formatDifPxRefManualMask,
  parseDifPxRefManualMask,
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
  const [display, setDisplay] = useState(() => formatDifPxRefManualMask(difPxRefManual));
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!editando) {
      setDisplay(formatDifPxRefManualMask(difPxRefManual));
    }
  }, [difPxRefManual, editando]);

  function applyInput(raw: string) {
    const parsed = parseDifPxRefManualMask(raw);
    if (parsed === undefined) return;
    setDisplay(parsed != null ? formatDifPxRefManualMask(parsed) : "");
    onDraftChange(parsed);
  }

  async function commit(raw: string) {
    const parsed = parseDifPxRefManualMask(raw);
    if (parsed === undefined) {
      toast.error("Ingresá un porcentaje entero válido.");
      setDisplay(formatDifPxRefManualMask(difPxRefManual));
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
        setDisplay(formatDifPxRefManualMask(difPxRefManual));
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
    return <CeldaDifPct pct={difPxRefManual} />;
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      disabled={pending}
      onChange={(e) => {
        setEditando(true);
        applyInput(e.target.value);
      }}
      onFocus={() => setEditando(true)}
      onBlur={() => void commit(display)}
      onPaste={(e) => {
        e.preventDefault();
        if (pending) return;
        setEditando(true);
        const text = e.clipboardData.getData("text");
        applyInput(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDisplay(formatDifPxRefManualMask(difPxRefManual));
          onDraftEnd();
          setEditando(false);
          e.currentTarget.blur();
        }
      }}
      className="h-7 min-w-0 w-full max-w-[5.5rem] mx-auto text-center tabular-nums"
      aria-label="DIF PX REF MANUAL"
      placeholder="—"
    />
  );
}
