"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import MontoArInput from "@/components/shared/MontoArInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearFinBalVtasAction } from "@/actions/finBalVtas";
import {
  montoArNormalizedStringToPesosIntRounded,
} from "@/lib/montoArMask";
import type { SucursalGeneraBalanceOption } from "@/services/finBalVtas.service";

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

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;
const ANIOS = Array.from({ length: ANIO_MAX - ANIO_MIN + 1 }, (_, i) => ANIO_MIN + i);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursales: SucursalGeneraBalanceOption[];
  defaultMes: number;
  defaultAnio: number;
}

export default function CrearFinBalVtasModal({
  open,
  onOpenChange,
  sucursales,
  defaultMes,
  defaultAnio,
}: Props) {
  const router = useRouter();
  const [sucursalId, setSucursalId] = useState("");
  const [mes, setMes] = useState(defaultMes);
  const [anio, setAnio] = useState(defaultAnio);
  const [montoNorm, setMontoNorm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSucursalId("");
    setMes(defaultMes);
    setAnio(defaultAnio);
    setMontoNorm("");
  }, [open, defaultMes, defaultAnio]);

  const montoPesosInt = useMemo(
    () => montoArNormalizedStringToPesosIntRounded(montoNorm),
    [montoNorm],
  );

  const puedeGuardar = useMemo(() => {
    if (!sucursalId || saving) return false;
    if (montoNorm.trim() === "") return false;
    if (montoPesosInt < 0) return false;
    if (mes < 1 || mes > 12) return false;
    if (anio < ANIO_MIN || anio > ANIO_MAX) return false;
    return true;
  }, [sucursalId, montoNorm, montoPesosInt, mes, anio, saving]);

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const r = await crearFinBalVtasAction({
        sucursalId,
        mes,
        anio,
        monto: montoPesosInt,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Registro guardado.");
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
        title="Nueva Carga De Ventas"
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
          <div className="space-y-2">
            <Label htmlFor="fin-bal-vtas-nueva-sucursal">Sucursal</Label>
            <Select
              value={sucursalId || undefined}
              onValueChange={setSucursalId}
              disabled={saving || sucursales.length === 0}
            >
              <SelectTrigger id="fin-bal-vtas-nueva-sucursal" className="input-filtro-unificado w-full">
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fin-bal-vtas-nueva-mes">Mes</Label>
              <Select
                value={String(mes)}
                onValueChange={(v) => setMes(Number(v))}
                disabled={saving}
              >
                <SelectTrigger id="fin-bal-vtas-nueva-mes" className="input-filtro-unificado w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro max-h-60">
                  {MESES.map((m) => (
                    <SelectItem key={m.valor} value={String(m.valor)}>
                      {m.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-bal-vtas-nueva-anio">Año</Label>
              <Select
                value={String(anio)}
                onValueChange={(v) => setAnio(Number(v))}
                disabled={saving}
              >
                <SelectTrigger id="fin-bal-vtas-nueva-anio" className="input-filtro-unificado w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro max-h-60">
                  {ANIOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fin-bal-vtas-nueva-monto">Monto (entero)</Label>
            <MontoArInput
              id="fin-bal-vtas-nueva-monto"
              valueNormalized={montoNorm}
              onValueNormalizedChange={setMontoNorm}
              disabled={saving}
              aria-label="Monto en pesos enteros"
            />
          </div>
          {sucursales.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay sucursales con genera_balance en true. Configurá al menos una en la base de datos.
            </p>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
