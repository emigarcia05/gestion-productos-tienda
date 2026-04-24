"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import MontoArInput from "@/components/shared/MontoArInput";
import { crearFinBalVtasAction } from "@/actions/finBalVtas";
import {
  montoArNormalizedStringToPesosIntRounded,
  montoArPesosEnterosToNormalizedString,
} from "@/lib/montoArMask";

const MESES: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "enero" },
  { valor: 2, etiqueta: "febrero" },
  { valor: 3, etiqueta: "marzo" },
  { valor: 4, etiqueta: "abril" },
  { valor: 5, etiqueta: "mayo" },
  { valor: 6, etiqueta: "junio" },
  { valor: 7, etiqueta: "julio" },
  { valor: 8, etiqueta: "agosto" },
  { valor: 9, etiqueta: "septiembre" },
  { valor: 10, etiqueta: "octubre" },
  { valor: 11, etiqueta: "noviembre" },
  { valor: 12, etiqueta: "diciembre" },
];

function etiquetaMes(mes: number): string {
  return MESES.find((m) => m.valor === mes)?.etiqueta ?? String(mes);
}

export interface EditarVentasBalanceMensualContext {
  sucursalId: string;
  nombreSucursal: string;
  mes: number;
  anio: number;
  ventaActual: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: EditarVentasBalanceMensualContext | null;
  onSuccess?: () => void;
}

export default function EditarVentasBalanceMensualModal({ open, onOpenChange, ctx, onSuccess }: Props) {
  const [montoNorm, setMontoNorm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ctx) return;
    setMontoNorm(montoArPesosEnterosToNormalizedString(ctx.ventaActual));
  }, [open, ctx]);

  const montoPesosInt = useMemo(() => montoArNormalizedStringToPesosIntRounded(montoNorm), [montoNorm]);

  const disabledSubmit = useMemo(() => {
    if (saving || !ctx) return true;
    if (montoPesosInt < 0) return true;
    return montoPesosInt === ctx.ventaActual;
  }, [saving, ctx, montoPesosInt]);

  async function handleGuardar() {
    if (!ctx || disabledSubmit) return;
    setSaving(true);
    try {
      const r = await crearFinBalVtasAction({
        sucursalId: ctx.sucursalId,
        mes: ctx.mes,
        anio: ctx.anio,
        monto: montoPesosInt,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Ventas guardadas.");
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
        title="Ventas del periodo"
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
        {ctx ? (
          <div className="grid gap-3 text-sm">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
              <div className="font-medium text-foreground">{ctx.nombreSucursal}</div>
              <div className="text-xs capitalize">
                {etiquetaMes(ctx.mes)} {ctx.anio}
              </div>
            </div>
            <label className="flex w-full flex-col items-center gap-1 text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Monto vendido
              </span>
              <MontoArInput
                valueNormalized={montoNorm}
                onValueNormalizedChange={setMontoNorm}
                disabled={saving}
                autoFocus
                aria-label="Monto vendido en pesos"
              />
            </label>
          </div>
        ) : null}
      </AppModal>
    </Dialog>
  );
}
