"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  eliminarFinBalGastoAction,
  eliminarFinBalGastoRubroAction,
  eliminarFinBalGastoTipoAction,
} from "@/actions/finBalGastosCatalogo";
import type { NivelCatalogo } from "./CrearEditarFinBalCatalogoItemModal";

/**
 * Confirmación de borrado para los 3 niveles del catálogo jerárquico
 * Finanzas → Balance → Gastos.
 *
 * El backend restringe el borrado con `onDelete: Restrict` cuando el nodo tiene
 * hijos; en ese caso el toast mostrará el error devuelto por la Action
 * ("No se puede eliminar el tipo porque tiene rubros asociados.", etc.).
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nivel: NivelCatalogo;
  id: string | null;
  nombre: string | null;
  onSuccess?: () => void;
}

const LABELS: Record<NivelCatalogo, { singular: string; articuloDefinido: string }> = {
  tipo: { singular: "Tipo", articuloDefinido: "el tipo" },
  rubro: { singular: "Rubro", articuloDefinido: "el rubro" },
  gasto: { singular: "Gasto", articuloDefinido: "el gasto" },
};

export default function EliminarFinBalCatalogoItemModal({
  open,
  onOpenChange,
  nivel,
  id,
  nombre,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);
  const labels = LABELS[nivel];

  async function handleDelete() {
    if (!id) return;
    setPending(true);
    try {
      const res = await dispatch(nivel, id);
      if (!res.ok) {
        toast.error(res.error ?? `No se pudo eliminar ${labels.articuloDefinido}.`);
        return;
      }
      toast.success(`${labels.singular} eliminado correctamente.`);
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={`Eliminar ${labels.singular}`}
        size="sm"
        className="max-w-md"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !id}
              onClick={handleDelete}
            >
              Sí, Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {id && nombre
            ? `¿Estás seguro de eliminar ${labels.articuloDefinido} "${nombre}"? Esta acción no se puede deshacer.`
            : `Seleccioná ${labels.articuloDefinido} para eliminar.`}
        </p>
      </AppModal>
    </Dialog>
  );
}

async function dispatch(
  nivel: NivelCatalogo,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (nivel === "tipo") {
    const r = await eliminarFinBalGastoTipoAction({ id });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }
  if (nivel === "rubro") {
    const r = await eliminarFinBalGastoRubroAction({ id });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }
  const r = await eliminarFinBalGastoAction({ id });
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
}
