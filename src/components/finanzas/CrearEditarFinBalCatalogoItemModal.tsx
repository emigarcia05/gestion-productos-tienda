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
import { cn } from "@/lib/utils";
import {
  crearFinBalGastoAction,
  crearFinBalGastoRubroAction,
  crearFinBalGastoTipoAction,
  editarFinBalGastoAction,
  editarFinBalGastoRubroAction,
  editarFinBalGastoTipoAction,
} from "@/actions/finBalGastosCatalogo";
import type { ProveedorOption } from "./FinBalGastosCatalogoPageClient";

/** Sentinel para el Select de proveedor (shadcn Select no acepta string vacío). */
const SIN_PROVEEDOR_SENTINEL = "__sin_proveedor__";

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
  /**
   * Lista de proveedores para el Select (solo relevante si `nivel === "gasto"`).
   * Es responsabilidad de la página cargarla en el Server Component.
   */
  proveedores?: ProveedorOption[];
  /**
   * Proveedor actualmente asignado al gasto (solo `nivel === "gasto"`).
   * `null` | `undefined` = sin proveedor.
   */
  proveedorIdInicial?: string | null;
  /**
   * Flag del gasto (solo `nivel === "gasto"`). `undefined` → `false` (default).
   */
  gastoMensualInicial?: boolean;
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
  proveedores,
  proveedorIdInicial = null,
  gastoMensualInicial = false,
  onSuccess,
}: Props) {
  const [nombre, setNombre] = useState("");
  /** Solo relevante si `nivel === "gasto"`. `null` = sin proveedor. */
  const [proveedorId, setProveedorId] = useState<string | null>(null);
  /** Flag del gasto (solo `nivel === "gasto"`). */
  const [gastoMensual, setGastoMensual] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(modo === "editar" ? nombreInicial : "");
    setProveedorId(nivel === "gasto" ? proveedorIdInicial ?? null : null);
    setGastoMensual(nivel === "gasto" ? gastoMensualInicial : false);
  }, [
    open,
    modo,
    nombreInicial,
    nivel,
    proveedorIdInicial,
    gastoMensualInicial,
  ]);

  const labels = LABELS[nivel];

  /**
   * En el alta de **gasto** mostramos únicamente el campo NOMBRE:
   *  - El `rubroId` padre ya viene por contexto (columna RUBROS seleccionada),
   *    así que el bloque informativo "RUBRO" no aporta valor nuevo.
   *  - El proveedor se asigna (opcionalmente) luego desde "Editar Gasto";
   *    al crear se persiste como `null` por defecto.
   * Edición de gasto sigue exponiendo contexto + Select "PROVEEDOR".
   */
  const esAltaGastoSoloNombre = modo === "crear" && nivel === "gasto";

  const hasChanges = useMemo(() => {
    if (modo !== "editar") return true;
    const nombreCambio =
      nombre.trim().toUpperCase() !== nombreInicial.trim().toUpperCase();
    const proveedorCambio =
      nivel === "gasto" && (proveedorId ?? null) !== (proveedorIdInicial ?? null);
    const gastoMensualCambio =
      nivel === "gasto" && gastoMensual !== gastoMensualInicial;
    return nombreCambio || proveedorCambio || gastoMensualCambio;
  }, [
    modo,
    nombre,
    nombreInicial,
    nivel,
    proveedorId,
    proveedorIdInicial,
    gastoMensual,
    gastoMensualInicial,
  ]);

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
        proveedorId: nivel === "gasto" ? proveedorId : null,
        gastoMensual: nivel === "gasto" ? gastoMensual : false,
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

          {nivel === "gasto" && !esAltaGastoSoloNombre && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                PROVEEDOR
              </span>
              <Select
                value={proveedorId ?? SIN_PROVEEDOR_SENTINEL}
                onValueChange={(value) =>
                  setProveedorId(value === SIN_PROVEEDOR_SENTINEL ? null : value)
                }
                disabled={saving}
              >
                <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                  <SelectValue placeholder="SELECCIONAR PROVEEDOR" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value={SIN_PROVEEDOR_SENTINEL}>SIN PROVEEDOR</SelectItem>
                  {(proveedores ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          {nivel === "gasto" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                GASTO MENSUAL
              </span>
              <Select
                value={gastoMensual ? "si" : "no"}
                onValueChange={(value) => setGastoMensual(value === "si")}
                disabled={saving}
              >
                <SelectTrigger className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="si">SI</SelectItem>
                  <SelectItem value="no">NO</SelectItem>
                </SelectContent>
              </Select>
            </label>
          )}
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
  proveedorId: string | null;
  gastoMensual: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { nombre, nivel, modo, id, parentId, proveedorId, gastoMensual } = args;
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
    // En edit, `parentId` es el tipoId actual (no hay UI para reparentar).
    const r = await editarFinBalGastoRubroAction({ id: id!, nombre, tipoId: parentId! });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }

  if (modo === "crear") {
    const r = await crearFinBalGastoAction({
      nombre,
      rubroId: parentId!,
      proveedorId,
      gastoMensual,
    });
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
  }
  // En edit, `parentId` es el rubroId actual (no hay UI para reparentar).
  const r = await editarFinBalGastoAction({
    id: id!,
    nombre,
    rubroId: parentId!,
    proveedorId,
    gastoMensual,
  });
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "" };
}
