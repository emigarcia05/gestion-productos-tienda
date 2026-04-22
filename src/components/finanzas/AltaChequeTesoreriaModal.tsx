"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MontoArInput from "@/components/shared/MontoArInput";
import { crearFinTesoreriaChequeAction } from "@/actions/finTesoreriaCheques";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import { montoArNormalizedStringToPesosIntRounded } from "@/lib/montoArMask";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cajaId: string | null;
  onCreated?: () => void;
}

export default function AltaChequeTesoreriaModal({
  open,
  onOpenChange,
  cajaId,
  onCreated,
}: Props) {
  const [emisor, setEmisor] = useState("");
  const [montoNorm, setMontoNorm] = useState("");
  const [fechaIso, setFechaIso] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmisor("");
    setMontoNorm("");
    setFechaIso(dateToIsoYmdArgentina(new Date()));
  }, [open]);

  const parsedMonto = useMemo(() => montoArNormalizedStringToPesosIntRounded(montoNorm), [montoNorm]);

  const disabledSubmit = useMemo(() => {
    return saving || !cajaId || emisor.trim().length === 0 || parsedMonto < 0;
  }, [saving, cajaId, emisor, parsedMonto]);

  async function handleSubmit() {
    if (disabledSubmit || !cajaId || !fechaIso) return;
    setSaving(true);
    try {
      const res = await crearFinTesoreriaChequeAction({
        cajaId,
        emisor: emisor.trim(),
        monto: parsedMonto,
        fechaAcreditacion: fechaIso,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo registrar el cheque.");
        return;
      }
      toast.success("Cheque registrado correctamente.");
      onOpenChange(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!saving ? onOpenChange(next) : undefined)}>
      <AppModal
        title="Registrar cheque"
        size="sm"
        className="sm:max-w-md"
        scrollBody={false}
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={disabledSubmit} onClick={handleSubmit}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              EMISOR
            </span>
            <Input
              value={emisor}
              onChange={(e) => setEmisor(e.target.value)}
              disabled={saving}
              placeholder="Nombre del emisor"
              aria-label="Emisor del cheque"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              MONTO
            </span>
            <MontoArInput
              valueNormalized={montoNorm}
              onValueNormalizedChange={setMontoNorm}
              disabled={saving}
              aria-label="Monto del cheque"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              FECHA ACREDITACIÓN
            </span>
            <Input
              type="date"
              value={fechaIso}
              onChange={(e) => setFechaIso(e.target.value)}
              disabled={saving}
              aria-label="Fecha de acreditación del cheque"
            />
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}
