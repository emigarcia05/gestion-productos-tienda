"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarFinBalGastoFinalAction } from "@/actions/finBalGastosCatalogo";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  proveedorNombre: string | null;
  sucursalNombre: string | null;
  gastoNombre: string | null;
  onSuccess?: () => void;
}

export default function EliminarFinBalGastoFinalModal({
  open,
  onOpenChange,
  id,
  proveedorNombre,
  sucursalNombre,
  gastoNombre,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!id) return;
    setPending(true);
    try {
      const r = await eliminarFinBalGastoFinalAction({ id });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo eliminar el gasto final.");
        return;
      }
      toast.success("Gasto final eliminado correctamente.");
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
        title="Eliminar Gasto Final"
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
          {id && proveedorNombre && gastoNombre
            ? sucursalNombre
              ? `¿Eliminar el gasto final "${gastoNombre}" — ${proveedorNombre} — ${sucursalNombre}? Esta acción no se puede deshacer.`
              : `¿Eliminar el gasto final "${gastoNombre}" — ${proveedorNombre} (eventual sin sucursal)? Esta acción no se puede deshacer.`
            : "Seleccioná un gasto final para eliminar."}
        </p>
      </AppModal>
    </Dialog>
  );
}
