"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import PorcentajeEnteroMaskInput from "@/components/shared/PorcentajeEnteroMaskInput";
import { formatDtoExtraComparacionMask } from "@/lib/comparacionCategoriasFormat";
import { actualizarDtoExtraComparacionAction } from "@/actions/comparacionCategorias";

interface Props {
  codExt: string;
  dtoExtra: number | null;
  puedeEditar: boolean;
  onDraftChange: (dtoExtra: number | null) => void;
  onDraftEnd: () => void;
  onSaved: (dtoExtra: number | null) => void;
}

function valorEfectivoDtoExtra(dtoExtra: number | null): number {
  return dtoExtra ?? 0;
}

export default function CeldaDtoExtraComparacion({
  codExt,
  dtoExtra,
  puedeEditar,
  onDraftChange,
  onDraftEnd,
  onSaved,
}: Props) {
  const [localValue, setLocalValue] = useState(() => valorEfectivoDtoExtra(dtoExtra));
  const [editando, setEditando] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!editando) {
      setLocalValue(valorEfectivoDtoExtra(dtoExtra));
    }
  }, [dtoExtra, editando]);

  async function commit() {
    const parsed = localValue;
    if (parsed < 0 || parsed > 99 || !Number.isSafeInteger(parsed)) {
      toast.error("Ingresá un porcentaje entero entre 0 y 99.");
      setLocalValue(valorEfectivoDtoExtra(dtoExtra));
      onDraftEnd();
      return;
    }
    if (parsed === valorEfectivoDtoExtra(dtoExtra)) {
      onDraftEnd();
      return;
    }

    setPending(true);
    try {
      const res = await actualizarDtoExtraComparacionAction(codExt, parsed);
      if (!res.ok) {
        toast.error(res.error ?? "Error al guardar DTO. EXTRA.");
        setLocalValue(valorEfectivoDtoExtra(dtoExtra));
        onDraftEnd();
        return;
      }
      onSaved(res.data?.dtoExtra ?? parsed);
      onDraftEnd();
    } finally {
      setPending(false);
      setEditando(false);
    }
  }

  if (!puedeEditar) {
    return (
      <span className="tabular-nums text-foreground">
        {formatDtoExtraComparacionMask(dtoExtra)}
      </span>
    );
  }

  return (
    <PorcentajeEnteroMaskInput
      value={localValue}
      min={0}
      max={99}
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
          setLocalValue(valorEfectivoDtoExtra(dtoExtra));
          onDraftEnd();
          setEditando(false);
          e.currentTarget.blur();
        }
      }}
      className="h-7 min-w-0 w-full max-w-[5.5rem] mx-auto text-center"
      aria-label="DTO. EXTRA comparación"
    />
  );
}
