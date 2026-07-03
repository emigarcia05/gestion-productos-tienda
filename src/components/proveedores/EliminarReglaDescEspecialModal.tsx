"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarReglaDescEspecialAction } from "@/actions/descEspecialReglas";
import type { ReglaDescEspecialListaPrecio } from "@/actions/descEspecialReglas";
import { fmtPorcentajeTabla } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regla: ReglaDescEspecialListaPrecio | null;
  onSuccess?: () => void;
}

export default function EliminarReglaDescEspecialModal({
  open,
  onOpenChange,
  regla,
  onSuccess,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleEliminar() {
    if (!regla) return;
    setPending(true);
    try {
      const result = await eliminarReglaDescEspecialAction({ id: regla.id });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo eliminar la regla.");
        return;
      }
      toast.success("Regla eliminada. Se limpió desc. específico en los productos.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AppModal
        title="Eliminar Regla Desc. Específico"
        size="sm"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleEliminar} disabled={pending || !regla}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
            </Button>
          </>
        }
      >
        {!regla ? (
          <p className="text-sm text-muted-foreground">Sin regla seleccionada.</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              ¿Eliminar la regla <strong>{regla.nombre}</strong> ({fmtPorcentajeTabla(regla.valor)}) con{" "}
              <strong>{regla.cantidadProductos}</strong> producto
              {regla.cantidadProductos !== 1 ? "s" : ""} vinculado
              {regla.cantidadProductos !== 1 ? "s" : ""}?
            </p>
            <p className="text-muted-foreground">
              Los productos dejarán de tener desc. específico materializado.
            </p>
          </div>
        )}
      </AppModal>
    </Dialog>
  );
}
