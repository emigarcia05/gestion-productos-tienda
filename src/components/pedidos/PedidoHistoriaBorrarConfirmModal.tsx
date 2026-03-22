"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { eliminarPedidoHistoriaAction } from "@/actions/pedidosHistoria";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoHistoriaId: string | null;
}

export default function PedidoHistoriaBorrarConfirmModal({
  open,
  onOpenChange,
  pedidoHistoriaId,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function confirmar() {
    if (!pedidoHistoriaId) return;
    setPending(true);
    try {
      const res = await eliminarPedidoHistoriaAction({ pedidoHistoriaId });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo borrar el pedido.");
        return;
      }
      toast.success("Pedido eliminado.");
      onOpenChange(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Borrar Pedido"
        size="md"
        scrollBody={false}
        padding="sm"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmar()}
              disabled={pending}
            >
              Sí, Borrar
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-10 w-10 shrink-0 text-destructive"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-foreground">
            ¿Está seguro que desea borrar este pedido? Esta acción no se puede
            deshacer.
          </p>
        </div>
      </AppModal>
    </Dialog>
  );
}
