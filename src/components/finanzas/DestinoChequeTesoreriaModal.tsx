"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import type { FinTesoreriaChequeItem } from "@/services/finTesoreriaCheques.service";
import { fmtPrecio } from "@/lib/format";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import {
  chequePuedeAcreditarsePorFechaArgentina,
  formatIsoYmdDdMmYyyyArgentina,
} from "@/lib/fechaArgentina";
import { CALLOUT_WARNING_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cheque: FinTesoreriaChequeItem | null;
  onAcreditarCuentaPropia: () => void;
  onPagoProveedor: () => void;
}

export default function DestinoChequeTesoreriaModal({
  open,
  onOpenChange,
  cheque,
  onAcreditarCuentaPropia,
  onPagoProveedor,
}: Props) {
  const permiteAcreditarEnCuentaPropia =
    cheque != null && chequePuedeAcreditarsePorFechaArgentina(cheque.fechaAcreditacionIso);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Destino Cheque"
        size="md"
        padding="sm"
        scrollBody={false}
        actions={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {cheque ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <p className="font-semibold tabular-nums">${fmtPrecio(cheque.monto)}</p>
              <p className="truncate text-muted-foreground" title={cheque.emisor}>
                {cheque.emisor}
              </p>
              <p className="text-xs text-muted-foreground">
                Acreditación: {formatIsoYmdDdMmYyyyArgentina(cheque.fechaAcreditacionIso)}
              </p>
            </div>
          ) : null}
          {cheque && !permiteAcreditarEnCuentaPropia ? (
            <p className={cn(CALLOUT_WARNING_CLASS, "text-sm")}>
              Este cheque está diferido: solo podés registrar{" "}
              <span className="font-semibold">pago a proveedor</span> hasta la fecha de acreditación (
              {formatIsoYmdDdMmYyyyArgentina(cheque.fechaAcreditacionIso)}).
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <ModalMicroLabel>Destino Cheque</ModalMicroLabel>
            {permiteAcreditarEnCuentaPropia ? (
              <Button
                type="button"
                className="h-11 w-full"
                disabled={!cheque}
                onClick={() => {
                  onAcreditarCuentaPropia();
                  onOpenChange(false);
                }}
              >
                Acreditar En Cuenta Propia
              </Button>
            ) : null}
            <Button
              type="button"
              className="h-11 w-full"
              disabled={!cheque}
              onClick={() => {
                onPagoProveedor();
                onOpenChange(false);
              }}
            >
              Pago Proveedor
            </Button>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
