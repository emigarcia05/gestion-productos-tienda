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
import { fmtPrecio } from "@/lib/format";

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
  /** `undefined` = aún no cargado; `null` = sin imputación en mes anterior. */
  const [ultMonto, setUltMonto] = useState<number | null | undefined>(undefined);
  const [loadingUltMonto, setLoadingUltMonto] = useState(false);
  const [aplicandoRepetir, setAplicandoRepetir] = useState(false);

  useEffect(() => {
    if (!open || !fila) return;
    setMontoNorm(montoArPesosEnterosToNormalizedString(fila.monto));
  }, [open, fila]);

  useEffect(() => {
    if (!open || !fila) {
      setUltMonto(undefined);
      return;
    }
    let cancelled = false;
    setLoadingUltMonto(true);
    setUltMonto(undefined);
    void (async () => {
      const r = await obtenerMontoMesAnteriorFinBalGastoMensualAction({
        gastoFinalId: fila.gastoFinalId,
        mes,
        anio,
      });
      if (cancelled) return;
      setLoadingUltMonto(false);
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo obtener el monto del mes anterior.");
        setUltMonto(null);
        return;
      }
      setUltMonto(r.data.monto);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fila?.id, fila?.gastoFinalId, mes, anio]);

  const montoPesosInt = useMemo(() => montoArNormalizedStringToPesosIntRounded(montoNorm), [montoNorm]);

  const disabledSubmit = useMemo(() => {
    if (saving || aplicandoRepetir || !fila) return true;
    if (montoPesosInt === fila.monto) return true;
    return false;
  }, [saving, aplicandoRepetir, fila, montoPesosInt]);

  const puedeRepetirMonto =
    !!fila &&
    !loadingUltMonto &&
    ultMonto !== undefined &&
    ultMonto !== null &&
    !saving &&
    !aplicandoRepetir;

  async function handleRepetirMonto() {
    if (!fila || !puedeRepetirMonto || ultMonto == null) return;
    setAplicandoRepetir(true);
    try {
      const r = await editarMontoFinBalGastoMensualAction({ id: fila.id, monto: ultMonto });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Monto actualizado con el del mes anterior.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setAplicandoRepetir(false);
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
        if ((saving || aplicandoRepetir) && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Editar Monto"
        size="md"
        className="sm:max-w-md"
        actions={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || aplicandoRepetir}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={disabledSubmit}
              onClick={() => void handleGuardar()}
            >
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
                MONTO
              </span>
              <MontoArInput
                valueNormalized={montoNorm}
                onValueNormalizedChange={setMontoNorm}
                disabled={saving || aplicandoRepetir}
                autoFocus
                aria-label="Monto en pesos"
              />
            </label>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-sm">
              <span className="min-w-0 text-muted-foreground">
                {loadingUltMonto || ultMonto === undefined ? (
                  <>Ult. Monto …</>
                ) : ultMonto !== null ? (
                  <>
                    Ult. Monto ${fmtPrecio(ultMonto)}
                  </>
                ) : (
                  <>Sin monto en mes anterior</>
                )}
              </span>
              <span className="text-muted-foreground select-none" aria-hidden>
                {" "}
                -{" "}
              </span>
              <Button
                type="button"
                variant="link"
                className="h-auto min-h-0 p-0 text-primary underline-offset-4"
                disabled={!puedeRepetirMonto}
                onClick={() => void handleRepetirMonto()}
              >
                {aplicandoRepetir ? "Aplicando…" : "Repetir Monto"}
              </Button>
            </div>
          </div>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
