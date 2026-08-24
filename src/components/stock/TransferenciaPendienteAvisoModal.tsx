"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferirAhora: () => void;
}

/**
 * Aviso al iniciar sesión: la sucursal del usuario es **SUC. ORIGEN**
 * de transferencias pendientes. **Transferir Ahora** abre Generar Transf.
 */
export default function TransferenciaPendienteAvisoModal({
  open,
  onOpenChange,
  onTransferirAhora,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <AppModal
        size="sm"
        title="Transferencia Pendiente!"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button type="button" onClick={onTransferirAhora}>
              Transferir Ahora
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground text-center">
          Tu sucursal figura como origen de transferencias pendientes.
        </p>
      </AppModal>
    </Dialog>
  );
}
