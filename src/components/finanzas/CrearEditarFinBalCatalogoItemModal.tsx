"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  crearFinBalGastoAction,
  crearFinBalGastoRubroAction,
  crearFinBalGastoTipoAction,
  editarFinBalGastoAction,
  editarFinBalGastoRubroAction,
  editarFinBalGastoTipoAction,
} from "@/actions/finBalGastosCatalogo";

/**
 * Modal unificado de alta/edición para los 3 niveles del catálogo jerárquico
 * Finanzas → Balance → Gastos: `tipo`, `rubro`, `gasto`.
 *
 * - Campo único editable: `nombre` (normalizado a MAYÚSCULAS desde el servidor;
 *   aquí además forzamos uppercase en el `onChange` por UX inmediato).
 * - El `parentId` es requerido para `rubro` (→ tipoId) y `gasto` (→ rubroId),
 *   y lo provee la página (no lo edita el usuario) ya que se elige por contexto
 *   (columna padre seleccionada).
 * - `modo`:
 *    - `"crear"`: llama al Action `crear*Action`.
 *    - `"editar"`: llama al Action `editar*Action` con el `id` actual.
 */

export type NivelCatalogo = "tipo" | "rubro" | "gasto";
type Modo = "crear" | "editar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nivel: NivelCatalogo;
  modo: Modo;
  /** Requerido en modo `editar`. */
  id?: string;
  /** Valor inicial del `nombre` (solo para `editar`). */
  nombreInicial?: string;
  /**
   * Para `rubro` es el `tipoId` padre.
   * Para `gasto` es el `rubroId` padre.
   * Para `tipo` no se usa.
   */
  parentId?: string;
  /** Nombre del padre, se muestra como contexto informativo (read-only). */
  parentNombre?: string;
  onSuccess?: () => void;
}

const LABELS: Record<NivelCatalogo, { singular: string; placeholder: string; parentLabel: string }> = {
  tipo: {
    singular: "Tipo",
    placeholder: "INGRESAR NOMBRE DEL TIPO",
    parentLabel: "",
  },
  rubro: {
    singular: "Rubro",
    placeholder: "INGRESAR NOMBRE DEL RUBRO",
    parentLabel: "TIPO",
  },
  gasto: {
    singular: "Gasto",
    placeholder: "INGRESAR NOMBRE DEL GASTO",
    parentLabel: "RUBRO",
  },
};

export default function CrearEditarFinBalCatalogoItemModal({
  open,
  onOpenChange,
  nivel,
  modo,
  id,
  nombreInicial = "",
  parentId,
  parentNombre,
  onSuccess,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(modo === "editar" ? nombreInicial : "");
  }, [open, modo, nombreInicial]);

  const labels = LABELS[nivel];

  /**
   * En el alta de **gasto** mostramos únicamente el campo NOMBRE:
   * el `rubroId` padre ya viene por contexto (columna RUBROS seleccionada).
   */
  const esAltaGastoSoloNombre = modo === "crear" && nivel === "gasto";

  const hasChanges = useMemo(() => {
    if (modo !== "editar") return true;
    return nombre.trim().toUpperCase() !== nombreInicial.trim().toUpperCase();
  }, [modo, nombre, nombreInicial]);

  const disabledSubmit = useMemo(() => {
    if (saving) return true;
    if (nombre.trim().length === 0) return true;
    if (modo === "editar" && !id) return true;
    if (modo === "editar" && !hasChanges) return true;
    if (modo === "crear" && nivel !== "tipo" && !parentId) return true;
    return false;
  }, [saving, nombre, modo, id, hasChanges, nivel, parentId]);

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      const res = await dispatch({
        nombre,
        nivel,
        modo,
        id,
        parentId,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(
        modo === "crear"
          ? `${labels.singular} creado correctamente.`
          : `${labels.singular} actualizado correctamente.`
      );
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  const titulo = `${modo === "crear" ? "Crear" : "Editar"} ${labels.singular}`;

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
          {nivel !== "tipo" && parentNombre && !esAltaGastoSoloNombre ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {labels.parentLabel}
              </span>
              <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium">
                {parentNombre}
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              NOMBRE
            </span>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              placeholder={labels.placeholder}
              maxLength={120}
              disabled={saving}
              autoFocus
            />
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}

// ─── Dispatch por nivel + modo ────────────────────────────────────────────

async function dispatch(args: {
  nombre: string;
  nivel: NivelCatalogo;
  modo: Modo;
  id?: string;
  parentId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { nombre, nivel, modo, id, parentId } = args;
  if (nivel === "tipo") {
    if (modo === "crear") {
      const r = await crearFinBalGastoTipoAction({ nombre });
      return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
    }
    const r = await editarFinBalGastoTipoAction({ id: id!, nombre });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }

  if (nivel === "rubro") {
    if (modo === "crear") {
      const r = await crearFinBalGastoRubroAction({ nombre, tipoId: parentId! });
      return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
    }
    const r = await editarFinBalGastoRubroAction({ id: id!, nombre, tipoId: parentId! });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }

  if (modo === "crear") {
    const r = await crearFinBalGastoAction({
      nombre,
      rubroId: parentId!,
    });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }
  const r = await editarFinBalGastoAction({
    id: id!,
    nombre,
    rubroId: parentId!,
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
}
