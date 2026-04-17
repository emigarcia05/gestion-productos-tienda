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
import { crearGastoCatalogoAction } from "@/actions/finanzasGastosCatalogo";
import { cn } from "@/lib/utils";

type TipoCosto = "VARIABLE" | "FIJO";

const TIPOS_COSTO: readonly TipoCosto[] = ["VARIABLE", "FIJO"] as const;

const RUBRO_NUEVO_VALUE = "__nuevo__";

export interface RubroCatalogoFila {
  id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubros: RubroCatalogoFila[];
  onCreated?: () => void;
}

export default function CrearGastoCatalogoModal({
  open,
  onOpenChange,
  rubros,
  onCreated,
}: Props) {
  const [rubroSeleccion, setRubroSeleccion] = useState("");
  const [rubroNombreNuevo, setRubroNombreNuevo] = useState("");
  const [tipoCosto, setTipoCosto] = useState<TipoCosto | "">("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const esRubroNuevo = rubroSeleccion === RUBRO_NUEVO_VALUE;

  const disabledSubmit = useMemo(() => {
    if (saving) return true;
    if (nombre.trim().length === 0) return true;
    if (tipoCosto.length === 0) return true;
    if (rubroSeleccion.length === 0) return true;
    if (esRubroNuevo && rubroNombreNuevo.trim().length === 0) return true;
    return false;
  }, [saving, nombre, tipoCosto, rubroSeleccion, esRubroNuevo, rubroNombreNuevo]);

  function resetForm() {
    setRubroSeleccion("");
    setRubroNombreNuevo("");
    setTipoCosto("");
    setNombre("");
  }

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      const payload = esRubroNuevo
        ? {
            modoRubro: "NUEVO" as const,
            rubroNombreNuevo,
            tipoCosto,
            nombre,
          }
        : {
            modoRubro: "EXISTENTE" as const,
            rubroId: rubroSeleccion,
            tipoCosto,
            nombre,
          };

      const res = await crearGastoCatalogoAction(payload);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear el gasto.");
        return;
      }

      toast.success("Gasto de catálogo creado correctamente.");
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
              RUBRO
            </span>
            <Select
              value={rubroSeleccion || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setRubroSeleccion("");
                  setRubroNombreNuevo("");
                  return;
                }
                setRubroSeleccion(value);
                if (value !== RUBRO_NUEVO_VALUE) setRubroNombreNuevo("");
              }}
              disabled={saving}
            >
              <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                <SelectValue placeholder="SELECCIONAR RUBRO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SELECCIONAR RUBRO</SelectItem>
                {rubros.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nombre}
                  </SelectItem>
                ))}
                <SelectItem value={RUBRO_NUEVO_VALUE}>+ CREAR NUEVO RUBRO</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {esRubroNuevo ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                NUEVO RUBRO
              </span>
              <Input
                value={rubroNombreNuevo}
                onChange={(e) => setRubroNombreNuevo(e.target.value.toUpperCase())}
                placeholder="INGRESAR NOMBRE DEL RUBRO"
                maxLength={120}
                disabled={saving}
                autoFocus
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              TIPO COSTO
            </span>
            <Select
              value={tipoCosto || "none"}
              onValueChange={(value) => setTipoCosto(value === "none" ? "" : (value as TipoCosto))}
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
                {TIPOS_COSTO.map((tipo) => (
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
        </div>
      </AppModal>
    </Dialog>
  );
}
