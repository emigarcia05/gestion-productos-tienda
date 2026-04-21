"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import MontoArInput from "@/components/shared/MontoArInput";
import {
  editarMontoFinBalGastoMensualAction,
  obtenerMontoMesAnteriorFinBalGastoMensualAction,
} from "@/actions/finBalGastoMensualBalance";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import {
  montoArNormalizedStringToPesosIntRounded,
  montoArPesosEnterosToNormalizedString,
} from "@/lib/montoArMask";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fila: BalanceGastoMensualFila | null;
  mes: number;
  anio: number;
  onSuccess?: () => void;
}

export default function EditarMontoFinBalGastoMensualModal({
  open,
  onOpenChange,
  fila,
  mes,
  anio,
  onSuccess,
}: Props) {
  const [montoNorm, setMontoNorm] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRepetir, setLoadingRepetir] = useState(false);

  useEffect(() => {
    if (!open || !fila) return;
    setMontoNorm(montoArPesosEnterosToNormalizedString(fila.monto));
  }, [open, fila]);

  const montoPesosInt = useMemo(() => montoArNormalizedStringToPesosIntRounded(montoNorm), [montoNorm]);

  const disabledSubmit = useMemo(() => {
    if (saving || !fila) return true;
    if (montoPesosInt === fila.monto) return true;
    return false;
  }, [saving, fila, montoPesosInt]);

  async function handleRepetirUltMonto() {
    if (!fila) return;
    setLoadingRepetir(true);
    try {
      const r = await obtenerMontoMesAnteriorFinBalGastoMensualAction({
        gastoFinalId: fila.gastoFinalId,
        mes,
        anio,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo obtener el monto anterior.");
        return;
      }
      if (r.data.monto === null) {
        toast.info("No hay imputación en el mes anterior para repetir.");
        return;
      }
      setMontoNorm(montoArPesosEnterosToNormalizedString(r.data.monto));
    } finally {
      setLoadingRepetir(false);
    }
  }

  async function handleGuardar() {
    if (!fila || disabledSubmit) return;
    setSaving(true);
    try {
      const r = await editarMontoFinBalGastoMensualAction({ id: fila.id, monto: montoPesosInt });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Monto actualizado.");
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
        title="Editar monto"
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
            <label className="flex w-full flex-col items-center gap-1 text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                MONTO ($)
              </span>
              <MontoArInput
                valueNormalized={montoNorm}
                onValueNormalizedChange={setMontoNorm}
                disabled={saving}
                autoFocus
                aria-label="Monto en pesos"
              />
            </label>
            <Button
              type="button"
              variant="default"
              disabled={saving || loadingRepetir}
              onClick={() => void handleRepetirUltMonto()}
            >
              {loadingRepetir ? "Buscando…" : "Repetir Ult. Monto"}
            </Button>
          </div>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
