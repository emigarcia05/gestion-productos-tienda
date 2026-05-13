"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { marcarEntregaProveedorFinTesoreriaChequeAction } from "@/actions/finTesoreriaCheques";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import { fmtPrecio } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: FinTesoreriaChequeItem | null;
  onGuardado?: () => void;
}

export default function PagoProveedorChequeTesoreriaModal({
  open,
  onOpenChange,
  cheque,
  onGuardado,
}: Props) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setPending(false);
  }, [open]);

  async function confirmar() {
    if (!cheque || pending) return;
    setPending(true);
    try {
      const res = await marcarEntregaProveedorFinTesoreriaChequeAction({
        chequeId: cheque.id,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo registrar el pago a proveedor.");
        return;
      }
      toast.success("Custodia actualizada a proveedor.");
      onOpenChange(false);
      onGuardado?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Pago Proveedor"
        size="sm"
        padding="sm"
        scrollBody={false}
        actions={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!cheque || pending} onClick={() => void confirmar()}>
              {pending ? "Guardando…" : "Confirmar"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          {cheque ? (
            <>
              <p className="text-muted-foreground">
                Cheque{" "}
                <span className="font-semibold text-foreground">${fmtPrecio(cheque.monto)}</span> —{" "}
                <span className="text-foreground">{cheque.emisor}</span>. Se marcará la custodia como{" "}
                <span className="font-semibold">PROVEEDOR</span> (entrega a proveedor de mercadería) sin
                transferir el importe a una caja DIGITAL.
              </p>
            </>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
