"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { eliminarReglaDescuentosListaPrecioAction } from "@/actions/descuentosListaPrecioReglas";
import type { ReglaDescuentoListaPrecio } from "@/actions/descuentosListaPrecioReglas";
import {
  fmtCondicionesReglaDescuento,
  labelCampoReglaDescuento,
} from "@/lib/descuentosListaPrecioReglasUi";
import { fmtPorcentajeTabla } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regla: ReglaDescuentoListaPrecio | null;
  onSuccess?: () => void;
}

export default function EliminarReglaDescuentoListaPrecioModal({
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
      const result = await eliminarReglaDescuentosListaPrecioAction({ id: regla.id });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo eliminar la regla.");
        return;
      }
      toast.success("Regla eliminada. Se recalculó la lista de precios.");
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
        title="Eliminar Regla De Descuento"
        size="sm"
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
              disabled={pending || !regla}
              onClick={handleEliminar}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, Eliminar"}
            </Button>
          </div>
        }
      >
        {regla ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>¿Eliminar esta regla? Se recalcularán todos los ítems de lista precios.</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>
                <span className="font-medium">{labelCampoReglaDescuento(regla.campo)}</span>
                {" → "}
                {fmtPorcentajeTabla(regla.valor)}
              </li>
              <li>Condiciones: {fmtCondicionesReglaDescuento(regla)}</li>
              <li>Especificidad: {regla.especificidad}</li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Seleccioná una regla para eliminar.</p>
        )}
      </AppModal>
    </Dialog>
  );
}
