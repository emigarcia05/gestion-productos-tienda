"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarListaPrecioAction } from "@/actions/listaPrecios";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fila: FilaListaPrecioParaCliente | null;
  onSuccess?: () => void;
}

export default function EliminarListaPrecioModal({ open, onOpenChange, fila, onSuccess }: Props) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!fila) return;
    setPending(true);
    try {
      const res = await eliminarListaPrecioAction({ codExt: fila.codExt });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar el producto.");
        return;
      }
      toast.success("Producto eliminado de la lista.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  const descripcion = fila?.descripcion?.trim() || fila?.codExt || "—";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Eliminar producto"
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
            <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
              Sí, Eliminar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          ¿Confirmás eliminar{" "}
          <span className="font-medium text-foreground">{descripcion}</span>
          {fila?.codExt ? (
            <>
              {" "}
              (<span className="font-mono">{fila.codExt}</span>)
            </>
          ) : null}
          ? Se borrará de la base de datos y no se puede deshacer.
        </p>
      </AppModal>
    </Dialog>
  );
}
