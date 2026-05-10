"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import MontoArInput from "@/components/shared/MontoArInput";
import { upsertFinBalIvaDebAction } from "@/actions/finBalIvaDeb";
import {
  montoArNormalizedStringToPesosIntRounded,
  montoArPesosEnterosToNormalizedString,
} from "@/lib/montoArMask";

const MESES: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  anio: number;
  /** Monto bruto ya guardado (`fin_bal_iva_deb.monto`), pesos enteros. */
  montoBrutoActual: number;
}

export default function TotalVentasConIvaModal({
  open,
  onOpenChange,
  mes,
  anio,
  montoBrutoActual,
}: Props) {
  const router = useRouter();
  const [montoNorm, setMontoNorm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMontoNorm(montoArPesosEnterosToNormalizedString(montoBrutoActual));
  }, [open, montoBrutoActual]);

  const etiquetaMes = MESES.find((m) => m.valor === mes)?.etiqueta ?? String(mes);

  const montoPesosInt = useMemo(
    () => montoArNormalizedStringToPesosIntRounded(montoNorm),
    [montoNorm],
  );

  const puedeGuardar = useMemo(() => {
    if (saving) return false;
    if (montoNorm.trim() === "") return false;
    if (montoPesosInt < 0) return false;
    return true;
  }, [montoNorm, montoPesosInt, saving]);

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const r = await upsertFinBalIvaDebAction({
        mes,
        anio,
        monto: montoPesosInt,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Total de ventas con IVA guardado.");
      onOpenChange(false);
      router.refresh();
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
        title="TOTAL VENTAS CON IVA"
        size="md"
        className="max-w-md"
        actions={
          <>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="button" disabled={!puedeGuardar} onClick={() => void handleGuardar()}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            Período: <span className="font-medium text-foreground">{etiquetaMes}</span>{" "}
            <span className="tabular-nums">{anio}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="fin-bal-iva-deb-monto">Monto (total ventas con IVA, entero)</Label>
            <MontoArInput
              id="fin-bal-iva-deb-monto"
              valueNormalized={montoNorm}
              onValueNormalizedChange={setMontoNorm}
              disabled={saving}
              aria-label="Total ventas con IVA en pesos enteros"
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
