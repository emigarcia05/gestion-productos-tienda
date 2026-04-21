"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MontoArInput from "@/components/shared/MontoArInput";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearMovimientoFinanzasAction } from "@/actions/movimientosFinanzas";
import { cn } from "@/lib/utils";
import { montoArNormalizedStringToPesosNumber } from "@/lib/montoArMask";

type TipoGasto = "EFECTIVO" | "BANCO" | "CHEQUE";

const TIPOS_GASTO: readonly TipoGasto[] = ["EFECTIVO", "BANCO", "CHEQUE"] as const;

export interface SucursalOptionFila {
  id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursales: SucursalOptionFila[];
  onCreated?: () => void;
}

export default function NuevoGastoModal({
  open,
  onOpenChange,
  sucursales,
  onCreated,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [tipoGasto, setTipoGasto] = useState<TipoGasto | "">("");
  const [sucursalId, setSucursalId] = useState("");
  const [montoNorm, setMontoNorm] = useState("");
  const [saving, setSaving] = useState(false);

  const montoNumber = useMemo(() => {
    const n = montoArNormalizedStringToPesosNumber(montoNorm);
    return Number.isFinite(n) && n > 0 ? n : Number.NaN;
  }, [montoNorm]);

  const disabledSubmit = useMemo(
    () =>
      saving ||
      nombre.trim().length === 0 ||
      tipoGasto.length === 0 ||
      sucursalId.trim().length === 0 ||
      !Number.isFinite(montoNumber),
    [saving, nombre, tipoGasto, sucursalId, montoNumber]
  );

  function resetForm() {
    setNombre("");
    setTipoGasto("");
    setSucursalId("");
    setMontoNorm("");
  }

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      const res = await crearMovimientoFinanzasAction({
        nombre,
        tipoGasto,
        sucursalId,
        monto: montoNumber,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear el gasto.");
        return;
      }

      toast.success("Gasto creado correctamente.");
      onOpenChange(false);
      resetForm();
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) resetForm();
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Crear Gasto"
        size="md"
        className="sm:max-w-xl"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                if (saving) return;
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={disabledSubmit} onClick={handleSubmit}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="grid min-h-0 grid-cols-1 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TIPO GASTO
            </span>
            <Select
              value={tipoGasto || "none"}
              onValueChange={(value) => setTipoGasto(value === "none" ? "" : (value as TipoGasto))}
              disabled={saving}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR TIPO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SELECCIONAR TIPO</SelectItem>
                {TIPOS_GASTO.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              NOMBRE
            </span>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              placeholder="INGRESAR NOMBRE DEL GASTO"
              maxLength={200}
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              SUCURSAL
            </span>
            <Select
              value={sucursalId || "none"}
              onValueChange={(value) => setSucursalId(value === "none" ? "" : value)}
              disabled={saving || sucursales.length === 0}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR SUCURSAL" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SELECCIONAR SUCURSAL</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              MONTO
            </span>
            <MontoArInput
              valueNormalized={montoNorm}
              onValueNormalizedChange={setMontoNorm}
              disabled={saving}
              aria-label="Monto del gasto"
            />
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}
