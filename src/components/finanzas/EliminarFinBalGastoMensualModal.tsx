"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarFinBalGastoMensualAction } from "@/actions/finBalGastoMensualBalance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  etiqueta: string | null;
  onSuccess?: () => void;
}

export default function EliminarFinBalGastoMensualModal({
  open,
  onOpenChange,
  id,
  etiqueta,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!id) return;
    setPending(true);
    try {
      const r = await eliminarFinBalGastoMensualAction({ id });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Imputación eliminada.");
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
        title="Eliminar Imputación"
        size="sm"
        className="max-w-md"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !id}
              onClick={() => void handleDelete()}
            >
              Sí, Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {id && etiqueta
            ? `¿Eliminar la imputación de "${etiqueta}"? Esta acción no se puede deshacer.`
            : "Seleccioná una fila para eliminar."}
        </p>
      </AppModal>
    </Dialog>
  );
}
