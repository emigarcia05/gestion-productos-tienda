"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectFieldWithCreate from "@/components/shared/SelectFieldWithCreate";
import CrearEditarFinBalCatalogoItemModal, {
  type FinBalCatalogoCreatedPayload,
  type NivelCatalogo,
} from "./CrearEditarFinBalCatalogoItemModal";
import { crearFinBalGastoAction } from "@/actions/finBalGastosCatalogo";
import type { FinBalGastoJerarquiaTipo } from "@/services/finBalGastosCatalogo.service";

/**
 * Modal "Crear Gasto" — alta de ítem hoja del catálogo jerárquico
 * `fin_bal_gasto_tipo → fin_bal_gasto_rubro → fin_bal_gasto`.
 *
 * Campos:
 *  - Tipo  (select con botón `+` para alta inline de un Tipo nuevo).
 *  - Rubro (select con botón `+` para alta inline de un Rubro nuevo,
 *           dependiente del Tipo elegido).
 *  - Gasto (texto libre; se normaliza a MAYÚSCULAS).
 *
 * Los submodales reutilizan `CrearEditarFinBalCatalogoItemModal` y sus
 * callbacks `onCreated` actualizan la jerarquía local para preseleccionar
 * automáticamente el ítem recién creado sin necesidad de refrescar la página.
 *
 * La sincronización con el servidor se hace vía `router.refresh()` en el
 * componente padre al ejecutarse `onCreated` del modal principal.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jerarquía completa Tipo → Rubros → Gastos provista por el Server Component. */
  jerarquia: FinBalGastoJerarquiaTipo[];
  /** Se dispara cuando se creó el gasto hoja con éxito (para refrescar el padre). */
  onCreated?: () => void;
}

type SubmodalState =
  | { open: false }
  | { open: true; nivel: NivelCatalogo; parentId?: string; parentNombre?: string };

export default function CrearFinBalGastoModal({
  open,
  onOpenChange,
  jerarquia,
  onCreated,
}: Props) {
  const [localJerarquia, setLocalJerarquia] = useState<FinBalGastoJerarquiaTipo[]>(
    jerarquia
  );
  const [tipoId, setTipoId] = useState("");
  const [rubroId, setRubroId] = useState("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [submodal, setSubmodal] = useState<SubmodalState>({ open: false });

  useEffect(() => {
    if (open) {
      setLocalJerarquia(jerarquia);
    } else {
      setTipoId("");
      setRubroId("");
      setNombre("");
      setSubmodal({ open: false });
    }
  }, [open, jerarquia]);

  const tipoSeleccionado = useMemo(
    () => localJerarquia.find((t) => t.id === tipoId) ?? null,
    [localJerarquia, tipoId]
  );

  const tiposOptions = useMemo(
    () => localJerarquia.map((t) => ({ value: t.id, label: t.nombre })),
    [localJerarquia]
  );

  const rubrosOptions = useMemo(
    () =>
      (tipoSeleccionado?.rubros ?? []).map((r) => ({
        value: r.id,
        label: r.nombre,
      })),
    [tipoSeleccionado]
  );

  const disabledSubmit = useMemo(
    () =>
      saving ||
      tipoId.trim().length === 0 ||
      rubroId.trim().length === 0 ||
      nombre.trim().length === 0,
    [saving, tipoId, rubroId, nombre]
  );

  function handleTipoChange(next: string) {
    setTipoId(next);
    setRubroId("");
  }

  function handleSubmodalCreated(payload: FinBalCatalogoCreatedPayload) {
    if (payload.nivel === "tipo") {
      const nuevoTipo: FinBalGastoJerarquiaTipo = {
        id: payload.data.id,
        nombre: payload.data.nombre,
        createdAt: payload.data.createdAt,
        updatedAt: payload.data.updatedAt,
        rubros: [],
      };
      setLocalJerarquia((prev) =>
        [...prev, nuevoTipo].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      );
      setTipoId(payload.data.id);
      setRubroId("");
      return;
    }

    if (payload.nivel === "rubro") {
      setLocalJerarquia((prev) =>
        prev.map((t) =>
          t.id === payload.data.tipoId
            ? {
                ...t,
                rubros: [
                  ...t.rubros,
                  {
                    id: payload.data.id,
                    nombre: payload.data.nombre,
                    tipoId: payload.data.tipoId,
                    createdAt: payload.data.createdAt,
                    updatedAt: payload.data.updatedAt,
                    gastos: [],
                  },
                ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
              }
            : t
        )
      );
      setRubroId(payload.data.id);
    }
  }

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      const res = await crearFinBalGastoAction({ nombre, rubroId });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear el gasto.");
        return;
      }
      toast.success("Gasto creado correctamente.");
      onOpenChange(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (saving && !next) return;
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
            <SelectFieldWithCreate
              label="TIPO"
              placeholder="SELECCIONAR TIPO"
              value={tipoId}
              onValueChange={handleTipoChange}
              options={tiposOptions}
              disabled={saving}
              onCreate={() => setSubmodal({ open: true, nivel: "tipo" })}
              createAriaLabel="Crear nuevo tipo"
              createTitle="Crear nuevo tipo"
            />

            <SelectFieldWithCreate
              label="RUBRO"
              placeholder={
                tipoSeleccionado
                  ? "SELECCIONAR RUBRO"
                  : "SELECCIONÁ UN TIPO PRIMERO"
              }
              value={rubroId}
              onValueChange={setRubroId}
              options={rubrosOptions}
              disabled={saving || !tipoSeleccionado}
              onCreate={
                tipoSeleccionado
                  ? () =>
                      setSubmodal({
                        open: true,
                        nivel: "rubro",
                        parentId: tipoSeleccionado.id,
                        parentNombre: tipoSeleccionado.nombre,
                      })
                  : undefined
              }
              createAriaLabel="Crear nuevo rubro"
              createTitle="Crear nuevo rubro"
              helper={
                !tipoSeleccionado
                  ? "Seleccioná un tipo para habilitar el rubro."
                  : undefined
              }
            />

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                GASTO
              </span>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                placeholder="INGRESAR NOMBRE DEL GASTO"
                maxLength={120}
                disabled={saving}
              />
            </label>
          </div>
        </AppModal>
      </Dialog>

      {submodal.open ? (
        <CrearEditarFinBalCatalogoItemModal
          open={submodal.open}
          onOpenChange={(next) => !next && setSubmodal({ open: false })}
          nivel={submodal.nivel}
          modo="crear"
          parentId={submodal.parentId}
          parentNombre={submodal.parentNombre}
          onCreated={handleSubmodalCreated}
        />
      ) : null}
    </>
  );
}
