"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarFinBalGastoProveeAction } from "@/actions/finBalGastosCatalogo";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string | null;
  proveedorNombre: string | null;
  gastoNombre: string | null;
  onSuccess?: () => void;
}

export default function EliminarFinBalGastoProveeModal({
  open,
  onOpenChange,
  id,
  proveedorNombre,
  gastoNombre,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!id) return;
    setPending(true);
    try {
      const r = await eliminarFinBalGastoProveeAction({ id });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo eliminar la asignación.");
        return;
      }
      toast.success("Asignación eliminada correctamente.");
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
        title="Eliminar asignación"
        size="sm"
        className="sm:max-w-md"
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
            ? `¿Eliminar la asignación del proveedor "${proveedorNombre}" al gasto "${gastoNombre}"? Esta acción no se puede deshacer.`
            : "Seleccioná una asignación para eliminar."}
        </p>
      </AppModal>
    </Dialog>
  );
}
