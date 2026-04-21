"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  crearFinBalGastoProveeAction,
  editarFinBalGastoProveeAction,
} from "@/actions/finBalGastosCatalogo";

type Modo = "crear" | "editar";

export interface ProveedorOpcionGastoProvee {
  id: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: Modo;
  /** Requerido en `editar`. */
  id?: string;
  gastoId: string;
  /** Solo lectura: nombre del gasto de catálogo. */
  gastoNombre: string;
  /** Proveedores elegibles (padre filtra `getProveedoresNoMercaderia` y exclusiones). */
  proveedoresOpciones: ProveedorOpcionGastoProvee[];
  proveedorIdInicial?: string;
  gastoMensualInicial?: boolean;
  onSuccess?: () => void;
}

export default function CrearEditarFinBalGastoProveeModal({
  open,
  onOpenChange,
  modo,
  id,
  gastoId,
  gastoNombre,
  proveedoresOpciones,
  proveedorIdInicial = "",
  gastoMensualInicial = false,
  onSuccess,
}: Props) {
  const [proveedorId, setProveedorId] = useState("");
  const [gastoMensual, setGastoMensual] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProveedorId(modo === "editar" ? proveedorIdInicial : "");
    setGastoMensual(modo === "editar" ? gastoMensualInicial : false);
  }, [open, modo, proveedorIdInicial, gastoMensualInicial]);

  const hasChanges = useMemo(() => {
    if (modo !== "editar") return true;
    return (
      proveedorId !== proveedorIdInicial ||
      gastoMensual !== gastoMensualInicial
    );
  }, [modo, proveedorId, proveedorIdInicial, gastoMensual, gastoMensualInicial]);

  const disabledSubmit = useMemo(() => {
    if (saving) return true;
    if (!proveedorId) return true;
    if (modo === "editar" && (!id || !hasChanges)) return true;
    return false;
  }, [saving, proveedorId, modo, id, hasChanges]);

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      if (modo === "crear") {
        const r = await crearFinBalGastoProveeAction({
          gastoId,
          proveedorId,
          gastoMensual,
        });
        if (!r.ok) {
          toast.error(r.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Asignación creada correctamente.");
      } else {
        const r = await editarFinBalGastoProveeAction({
          id: id!,
          proveedorId,
          gastoMensual,
        });
        if (!r.ok) {
          toast.error(r.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Asignación actualizada correctamente.");
      }
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  const titulo = modo === "crear" ? "Nueva asignación" : "Editar asignación";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={titulo}
        size="md"
        className="sm:max-w-lg"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
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
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              GASTO
            </span>
            <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium">
              {gastoNombre}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              PROVEEDOR
            </span>
            <Select
              value={proveedorId || undefined}
              onValueChange={setProveedorId}
              disabled={saving || proveedoresOpciones.length === 0}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                {proveedoresOpciones.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              GASTO MENSUAL
            </span>
            <Select
              value={gastoMensual ? "si" : "no"}
              onValueChange={(v) => setGastoMensual(v === "si")}
              disabled={saving}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                <SelectItem value="no">NO</SelectItem>
                <SelectItem value="si">SÍ</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}
