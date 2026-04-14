"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearCajaTesoreriaAction } from "@/actions/cajasTesoreria";
import { cn } from "@/lib/utils";

interface SucursalOption {
  id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursales: SucursalOption[];
  onCreated?: () => void;
}

export default function NuevaCajaTesoreriaModal({
  open,
  onOpenChange,
  sucursales,
  onCreated,
}: Props) {
  const [nombreCaja, setNombreCaja] = useState("");
  const [tipoCaja, setTipoCaja] = useState<"DIGITAL" | "EFECTIVO" | "CHEQUE">("EFECTIVO");
  const [sucursalId, setSucursalId] = useState("");
  const [saving, setSaving] = useState(false);

  const disabledSubmit = useMemo(
    () =>
      saving ||
      nombreCaja.trim().length === 0 ||
      tipoCaja.trim().length === 0 ||
      sucursalId.trim().length === 0,
    [saving, nombreCaja, tipoCaja, sucursalId]
  );

  function resetForm() {
    setNombreCaja("");
    setTipoCaja("EFECTIVO");
    setSucursalId("");
  }

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      const res = await crearCajaTesoreriaAction({
        nombreCaja,
        tipoCaja,
        sucursalId,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear la caja.");
        return;
      }

      toast.success("Caja creada correctamente.");
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
        title="Nueva Caja"
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
              NOMBRE CAJA
            </span>
            <Input
              value={nombreCaja}
              onChange={(e) => setNombreCaja(e.target.value)}
              placeholder="Ingresar nombre de caja"
              maxLength={120}
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TIPO CAJA
            </span>
            <Select
              value={tipoCaja}
              onValueChange={(value) => setTipoCaja(value as "DIGITAL" | "EFECTIVO" | "CHEQUE")}
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
                <SelectItem value="DIGITAL">Digital</SelectItem>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              SUCURSAL
            </span>
            <Select value={sucursalId} onValueChange={setSucursalId} disabled={saving}>
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR SUCURSAL" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}
