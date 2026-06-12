"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  formatDtoExtraComparacionMask,
  parseDtoExtraComparacionMask,
} from "@/lib/comparacionCategoriasFormat";
import { actualizarDtoExtraComparacionAction } from "@/actions/comparacionCategorias";

interface Props {
  codExt: string;
  dtoExtra: number | null;
  puedeEditar: boolean;
  onDraftChange: (dtoExtra: number | null) => void;
  onDraftEnd: () => void;
  onSaved: (dtoExtra: number | null) => void;
}

export default function CeldaDtoExtraComparacion({
  codExt,
  dtoExtra,
  puedeEditar,
  onDraftChange,
  onDraftEnd,
  onSaved,
}: Props) {
  const [display, setDisplay] = useState(() => formatDtoExtraComparacionMask(dtoExtra));
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!editando) {
      setDisplay(formatDtoExtraComparacionMask(dtoExtra));
    }
  }, [dtoExtra, editando]);

  function applyInput(raw: string) {
    const parsed = parseDtoExtraComparacionMask(raw);
    if (parsed === undefined) return;
    setDisplay(parsed != null ? formatDtoExtraComparacionMask(parsed) : "");
    onDraftChange(parsed);
  }

  async function commit(raw: string) {
    const parsed = parseDtoExtraComparacionMask(raw);
    if (parsed === undefined) {
      toast.error("Ingresá un porcentaje entero entre 0 y 99.");
      setDisplay(formatDtoExtraComparacionMask(dtoExtra));
      onDraftEnd();
      return;
    }
    if (parsed === dtoExtra) {
      onDraftEnd();
      return;
    }

    setPending(true);
    try {
      const res = await actualizarDtoExtraComparacionAction(codExt, parsed);
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar DTO. EXTRA.");
        setDisplay(formatDtoExtraComparacionMask(dtoExtra));
        onDraftEnd();
        return;
      }
      onSaved(res.data?.dtoExtra ?? null);
      onDraftEnd();
    } finally {
      setPending(false);
      setEditando(false);
    }
  }

  if (!puedeEditar) {
    return (
      <span className="tabular-nums text-foreground">
        {dtoExtra != null ? formatDtoExtraComparacionMask(dtoExtra) : "—"}
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
          setDisplay(formatDtoExtraComparacionMask(dtoExtra));
          onDraftEnd();
          setEditando(false);
          e.currentTarget.blur();
        }
      }}
      className="h-7 min-w-0 w-full max-w-[5.5rem] mx-auto text-center tabular-nums"
      aria-label="DTO. EXTRA comparación"
      placeholder="—"
    />
  );
}
