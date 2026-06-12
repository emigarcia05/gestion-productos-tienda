"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { fmtPrecio } from "@/lib/format";
import { actualizarPxManualComparacionAction } from "@/actions/comparacionCategorias";

function parsePxManualInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n <= 0) return undefined;
  return n;
}

interface Props {
  codExt: string;
  pxManual: number | null;
  puedeEditar: boolean;
  onSaved: (pxManual: number | null) => void;
}

export default function CeldaPxManualComparacion({
  codExt,
  pxManual,
  puedeEditar,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(pxManual != null ? String(pxManual) : "");
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!editando) {
      setDraft(pxManual != null ? String(pxManual) : "");
    }
  }, [pxManual, editando]);

  async function commit(raw: string) {
    const parsed = parsePxManualInput(raw);
    if (parsed === undefined) {
      toast.error("Ingresá un número entero mayor a cero.");
      setDraft(pxManual != null ? String(pxManual) : "");
      return;
    }
    if (parsed === pxManual) return;

    setPending(true);
    try {
      const res = await actualizarPxManualComparacionAction(codExt, parsed);
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar px manual.");
        setDraft(pxManual != null ? String(pxManual) : "");
        return;
      }
      onSaved(res.data?.pxManual ?? null);
    } finally {
      setPending(false);
      setEditando(false);
    }
  }

  if (!puedeEditar) {
    return (
      <span className="tabular-nums text-foreground">
        {pxManual != null ? `$${fmtPrecio(pxManual)}` : "—"}
      </span>
    );
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      disabled={pending}
      onChange={(e) => {
        setEditando(true);
        setDraft(e.target.value.replace(/\D/g, ""));
      }}
      onFocus={() => setEditando(true)}
      onBlur={() => void commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(pxManual != null ? String(pxManual) : "");
          setEditando(false);
          e.currentTarget.blur();
        }
      }}
      className="h-7 min-w-0 w-full max-w-[6.5rem] mx-auto text-center tabular-nums"
      aria-label="Px manual"
      placeholder="—"
    />
  );
}
