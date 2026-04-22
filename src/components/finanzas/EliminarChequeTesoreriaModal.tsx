"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarFinTesoreriaChequeAction } from "@/actions/finTesoreriaCheques";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chequeId: string | null;
  etiquetaEmisor?: string;
  onDeleted?: () => void;
}

export default function EliminarChequeTesoreriaModal({
  open,
  onOpenChange,
  chequeId,
  etiquetaEmisor,
  onDeleted,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!chequeId) return;
    setPending(true);
    try {
      const res = await eliminarFinTesoreriaChequeAction({ id: chequeId });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar el cheque.");
        return;
      }
      toast.success("Cheque eliminado correctamente.");
      onOpenChange(false);
      onDeleted?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!pending ? onOpenChange(next) : undefined)}>
      <AppModal
        title="Eliminar Cheque"
        size="sm"
        className="sm:max-w-md"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !chequeId}
              onClick={handleDelete}
            >
              Sí, Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {chequeId
            ? `¿Eliminar el cheque${etiquetaEmisor ? ` (${etiquetaEmisor})` : ""}? Esta acción no se puede deshacer.`
            : "No hay un cheque seleccionado."}
        </p>
      </AppModal>
    </Dialog>
  );
}
