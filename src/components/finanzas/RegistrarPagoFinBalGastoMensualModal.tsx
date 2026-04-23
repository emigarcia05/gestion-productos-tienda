"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import MontoArInput from "@/components/shared/MontoArInput";
import { registrarPagoFinBalGastoMensualAction } from "@/actions/finBalGastoMensualBalance";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import {
  montoArNormalizedStringToPesosIntRounded,
  montoArPesosEnterosToNormalizedString,
} from "@/lib/montoArMask";
import { fmtPrecio } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fila: BalanceGastoMensualFila | null;
  onSuccess?: () => void;
}

export default function RegistrarPagoFinBalGastoMensualModal({
  open,
  onOpenChange,
  fila,
  onSuccess,
}: Props) {
  const [pagadoNorm, setPagadoNorm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !fila) return;
    setPagadoNorm(montoArPesosEnterosToNormalizedString(fila.pagado));
  }, [open, fila]);

  const pagadoPesosInt = useMemo(
    () => montoArNormalizedStringToPesosIntRounded(pagadoNorm),
    [pagadoNorm]
  );

  const disabledSubmit = useMemo(() => {
    if (saving || !fila) return true;
    if (pagadoPesosInt === fila.pagado) return true;
    if (pagadoPesosInt > fila.monto) return true;
    return false;
  }, [saving, fila, pagadoPesosInt]);

  const disabledPagarTotal = useMemo(() => {
    if (saving || !fila) return true;
    if (fila.monto <= 0) return true;
    if (fila.pagado >= fila.monto) return true;
    return false;
  }, [saving, fila]);

  async function handleGuardar() {
    if (!fila || disabledSubmit) return;
    setSaving(true);
    try {
      const r = await registrarPagoFinBalGastoMensualAction({ id: fila.id, pagado: pagadoPesosInt });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Pago registrado.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  async function handlePagarTotal() {
    if (!fila || disabledPagarTotal) return;
    setSaving(true);
    try {
      const r = await registrarPagoFinBalGastoMensualAction({
        id: fila.id,
        pagado: fila.monto,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo registrar el pago total.");
        return;
      }
      toast.success("Pago total registrado.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Registrar Pago"
        size="md"
        className="sm:max-w-md"
        actions={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={disabledSubmit} onClick={() => void handleGuardar()}>
              Guardar
            </Button>
          </div>
        }
      >
        {fila ? (
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
              <div className="font-medium text-foreground">{fila.gastoNombre}</div>
              <div className="text-xs">
                {fila.proveedorNombre} · {fila.sucursalNombre}
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Monto imputado: <span className="font-semibold text-foreground">${fmtPrecio(fila.monto)}</span>{" "}
              (máximo pagado)
            </p>
            <label className="flex w-full flex-col items-center gap-1 text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                PAGADO
              </span>
              <MontoArInput
                valueNormalized={pagadoNorm}
                onValueNormalizedChange={setPagadoNorm}
                disabled={saving}
                autoFocus
                aria-label="Importe pagado en pesos"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={disabledPagarTotal}
              onClick={() => void handlePagarTotal()}
            >
              PAGAR TOTAL
            </Button>
          </div>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
