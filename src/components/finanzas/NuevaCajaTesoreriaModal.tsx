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
import { TITULARES_CAJA_TESORERIA, type TitularCajaTesoreria } from "@/lib/cajasTesoreriaTitulares";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function NuevaCajaTesoreriaModal({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [nombreCaja, setNombreCaja] = useState("");
  const [titular, setTitular] = useState<TitularCajaTesoreria | "">("");
  const [tipoCaja, setTipoCaja] = useState<"DIGITAL" | "EFECTIVO" | "CHEQUE">("EFECTIVO");
  const [saving, setSaving] = useState(false);

  const disabledSubmit = useMemo(
    () =>
      saving ||
      nombreCaja.trim().length === 0 ||
      titular.trim().length === 0 ||
      tipoCaja.trim().length === 0,
    [saving, nombreCaja, titular, tipoCaja]
  );

  function resetForm() {
    setNombreCaja("");
    setTitular("");
    setTipoCaja("EFECTIVO");
  }

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      const res = await crearCajaTesoreriaAction({
        nombreCaja,
        titular,
        tipoCaja,
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
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
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

        </div>
      </AppModal>
    </Dialog>
  );
}
