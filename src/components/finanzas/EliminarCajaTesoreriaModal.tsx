"use client";

import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarCajaTesoreriaAction } from "@/actions/cajasTesoreria";
import type { TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caja: TesoreriaCajaFila | null;
  onDeleted?: () => void;
}

export default function EliminarCajaTesoreriaModal({
  open,
  onOpenChange,
  caja,
  onDeleted,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!caja) return;
    setPending(true);
    try {
      const res = await eliminarCajaTesoreriaAction({ id: caja.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar la caja.");
        return;
      }
      toast.success("Caja eliminada correctamente.");
      onOpenChange(false);
      onDeleted?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!pending ? onOpenChange(next) : undefined)}>
      <AppModal
        title="Eliminar Caja"
        size="sm"
        className="max-w-md"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={pending || !caja} onClick={handleDelete}>
              Sí, Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {caja
            ? `¿Estás seguro de eliminar la caja ${caja.nombreCaja}? Esta acción no se puede deshacer.`
            : "Seleccioná una caja para eliminar."}
        </p>
      </AppModal>
    </Dialog>
  );
}
