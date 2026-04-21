"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  editarMontoFinBalGastoMensualAction,
  obtenerMontoMesAnteriorFinBalGastoMensualAction,
} from "@/actions/finBalGastoMensualBalance";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import { fmtPrecio } from "@/lib/format";

function parseMontoPesosInput(raw: string): number | null {
  const s = raw.replace(/\./g, "").replace(/,/g, ".").trim();
  if (s === "") return null;
  const n = Math.round(Number(s));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

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
  const [montoTexto, setMontoTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRepetir, setLoadingRepetir] = useState(false);

  useEffect(() => {
    if (!open || !fila) return;
    setMontoTexto(fila.monto === 0 ? "" : fmtPrecio(fila.monto));
  }, [open, fila]);

  const montoParsed = useMemo(() => parseMontoPesosInput(montoTexto), [montoTexto]);

  const disabledSubmit = useMemo(() => {
    if (saving || !fila) return true;
    if (montoParsed === null) return true;
    if (montoParsed === fila.monto) return true;
    return false;
  }, [saving, fila, montoParsed]);

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
      setMontoTexto(fmtPrecio(r.data.monto));
    } finally {
      setLoadingRepetir(false);
    }
  }

  async function handleGuardar() {
    if (!fila || montoParsed === null || disabledSubmit) return;
    setSaving(true);
    try {
      const r = await editarMontoFinBalGastoMensualAction({ id: fila.id, monto: montoParsed });
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
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                MONTO ($)
              </span>
              <Input
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                disabled={saving}
                autoFocus
              />
            </label>
            <Button
              type="button"
              variant="secondary"
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
