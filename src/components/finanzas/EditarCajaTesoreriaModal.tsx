"use client";

import { useEffect, useMemo, useState } from "react";
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
import { editarCajaTesoreriaAction } from "@/actions/cajasTesoreria";
import { cn } from "@/lib/utils";
import type { TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import { TITULARES_CAJA_TESORERIA, type TitularCajaTesoreria } from "@/lib/cajasTesoreriaTitulares";
import { OPCIONES_TIPO_CAJA_TESORERIA_UI } from "@/lib/cajasTesoreriaTipos";
import type { TipoCajaTesoreria } from "@prisma/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caja: TesoreriaCajaFila | null;
  onUpdated?: () => void;
}

export default function EditarCajaTesoreriaModal({
  open,
  onOpenChange,
  caja,
  onUpdated,
}: Props) {
  const [nombreCaja, setNombreCaja] = useState("");
  const [titular, setTitular] = useState<TitularCajaTesoreria | "">("");
  const [tipoCaja, setTipoCaja] = useState<TipoCajaTesoreria>("EFECTIVO");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !caja) return;
    setNombreCaja(caja.nombreCaja);
    setTitular(caja.titular as TitularCajaTesoreria);
    setTipoCaja(caja.tipoCaja as TipoCajaTesoreria);
  }, [open, caja]);

  function resetForm() {
    setNombreCaja("");
    setTitular("");
    setTipoCaja("EFECTIVO");
  }

  const hasChanges = useMemo(() => {
    if (!caja) return false;
    return (
      nombreCaja.trim() !== caja.nombreCaja ||
      titular.trim() !== caja.titular ||
      tipoCaja.trim() !== caja.tipoCaja
    );
  }, [caja, nombreCaja, titular, tipoCaja]);

  const disabledSubmit = useMemo(
    () =>
      saving ||
      !caja ||
      nombreCaja.trim().length === 0 ||
      titular.trim().length === 0 ||
      tipoCaja.trim().length === 0 ||
      !hasChanges,
    [saving, caja, nombreCaja, titular, tipoCaja, hasChanges]
  );

  async function handleSubmit() {
    if (!caja || disabledSubmit) return;
    setSaving(true);
    try {
      const res = await editarCajaTesoreriaAction({
        id: caja.id,
        nombreCaja,
        titular,
        tipoCaja,
        monto: caja.monto,
      });

      if (!res.ok) {
        toast.error(res.error ?? "No se pudo editar la caja.");
        return;
      }

      toast.success("Caja actualizada correctamente.");
      onOpenChange(false);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) {
          if (!next) resetForm();
          onOpenChange(next);
        }
      }}
    >
      <AppModal
        title="Editar Caja"
        size="md"
        className="max-w-xl"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={disabledSubmit} onClick={handleSubmit}>
              Guardar Cambios
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
              onChange={(e) => setNombreCaja(e.target.value.toUpperCase())}
              placeholder="INGRESAR NOMBRE DE CAJA"
              maxLength={120}
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TITULAR
            </span>
            <Select
              value={titular || "none"}
              onValueChange={(value) => setTitular(value === "none" ? "" : (value as TitularCajaTesoreria))}
              disabled={saving}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR TITULAR" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="none">SELECCIONAR TITULAR</SelectItem>
                {TITULARES_CAJA_TESORERIA.map((titularOption) => (
                  <SelectItem key={titularOption} value={titularOption}>
                    {titularOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TIPO CAJA
            </span>
            <Select
              value={tipoCaja}
              onValueChange={(value) => setTipoCaja(value as TipoCajaTesoreria)}
              disabled={saving}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR TIPO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                {OPCIONES_TIPO_CAJA_TESORERIA_UI.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
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
