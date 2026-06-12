"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  formatPxManualEnteroMask,
  parsePxManualEnteroMask,
} from "@/lib/comparacionCategoriasFormat";
import { actualizarPxManualComparacionAction } from "@/actions/comparacionCategorias";

interface Props {
  codExt: string;
  pxManual: number | null;
  puedeEditar: boolean;
  onDraftChange: (pxManual: number | null) => void;
  onDraftEnd: () => void;
  onSaved: (pxManual: number | null) => void;
}

export default function CeldaPxManualComparacion({
  codExt,
  pxManual,
  puedeEditar,
  onDraftChange,
  onDraftEnd,
  onSaved,
}: Props) {
  const [display, setDisplay] = useState(() => formatPxManualEnteroMask(pxManual));
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!editando) {
      setDisplay(formatPxManualEnteroMask(pxManual));
    }
  }, [pxManual, editando]);

  function applyInput(raw: string) {
    const parsed = parsePxManualEnteroMask(raw);
    if (parsed === undefined) return;
    setDisplay(parsed != null ? formatPxManualEnteroMask(parsed) : "");
    onDraftChange(parsed);
  }

  async function commit(raw: string) {
    const parsed = parsePxManualEnteroMask(raw);
    if (parsed === undefined) {
      toast.error("Ingresá un importe entero mayor a cero.");
      setDisplay(formatPxManualEnteroMask(pxManual));
      onDraftEnd();
      return;
    }
    if (parsed === pxManual) {
      onDraftEnd();
      return;
    }

    setPending(true);
    try {
      const res = await actualizarPxManualComparacionAction(codExt, parsed);
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar px manual.");
        setDisplay(formatPxManualEnteroMask(pxManual));
        onDraftEnd();
        return;
      }
      onSaved(res.data?.pxManual ?? null);
      onDraftEnd();
    } finally {
      setPending(false);
      setEditando(false);
    }
  }

  if (!puedeEditar) {
    return (
      <span className="tabular-nums text-foreground">
        {pxManual != null ? formatPxManualEnteroMask(pxManual) : "—"}
      </span>
    );
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
          setDisplay(formatPxManualEnteroMask(pxManual));
          onDraftEnd();
          setEditando(false);
          e.currentTarget.blur();
        }
      }}
      className="h-7 min-w-0 w-full max-w-[9rem] mx-auto text-center tabular-nums"
      aria-label="Px manual"
      placeholder="—"
    />
  );
}
