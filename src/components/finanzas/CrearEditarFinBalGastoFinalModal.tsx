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
  crearFinBalGastoFinalAction,
  editarFinBalGastoFinalAction,
} from "@/actions/finBalGastosCatalogo";
import { diaDevengadoFinBalDesdeCalendarioArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";

type Modo = "crear" | "editar";

export interface ProveedorOpcionGastoFinal {
  id: string;
  nombre: string;
}

/** Otras filas `fin_bal_gasto_final` del mismo gasto de catálogo (para reglas de COMENTARIOS). */
export interface FinBalGastoFinalFilaHermana {
  id: string;
  proveedorId: string;
  sucursalId: string;
  comentarios: string | null;
}

function comentariosNormModal(c: string | null | undefined): string {
  if (c == null || c === "") return "";
  const t = c.trim().toLocaleUpperCase("es-AR");
  return t === "" ? "" : t;
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
  proveedoresOpciones: ProveedorOpcionGastoFinal[];
  sucursales: { id: string; nombre: string }[];
  /** Filas de gasto final ya cargadas para este mismo gasto de catálogo (ids + proveedor + sucursal + comentarios). */
  filasMismoGastoFinal?: FinBalGastoFinalFilaHermana[];
  proveedorIdInicial?: string;
  sucursalIdInicial?: string;
  gastoMensualInicial?: boolean;
  /** En edición: valor persistido (1–28) para mensual; `null` en eventual. */
  diaDevengadoInicial?: number | null;
  /** En edición: días de vencimiento persistidos. */
  vencimientoInicial?: number | null;
  /** En edición: comentarios persistidos (`fin_bal_gasto_final.comentarios`). */
  comentariosInicial?: string | null;
  onSuccess?: () => void;
}

function comentariosNormalizadosParaEstado(raw: string | null | undefined): string {
  return (raw ?? "").toLocaleUpperCase("es-AR");
}

export default function CrearEditarFinBalGastoFinalModal({
  open,
  onOpenChange,
  modo,
  id,
  gastoId,
  gastoNombre,
  proveedoresOpciones,
  sucursales,
  filasMismoGastoFinal = [],
  proveedorIdInicial = "",
  sucursalIdInicial = "",
  gastoMensualInicial = false,
  diaDevengadoInicial = null,
  vencimientoInicial = null,
  comentariosInicial = null,
  onSuccess,
}: Props) {
  const diasOpciones = useMemo(() => Array.from({ length: 28 }, (_, i) => i + 1), []);
  const plazoPagoOpciones = useMemo(() => Array.from({ length: 31 }, (_, i) => i), []);
  const normalizarPlazoPago = (value: number) => Math.max(0, Math.min(30, Math.trunc(value)));

  const [sucursalId, setSucursalId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [gastoMensual, setGastoMensual] = useState(false);
  const [diaDevengado, setDiaDevengado] = useState(1);
  const [comentarios, setComentarios] = useState("");
  const [vencimiento, setVencimiento] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esEdicion = modo === "editar";
    setSucursalId(esEdicion ? sucursalIdInicial : "");
    setProveedorId(esEdicion ? proveedorIdInicial : "");
    const mensualInicial = esEdicion ? gastoMensualInicial : false;
    setGastoMensual(mensualInicial);
    setDiaDevengado(
      esEdicion && diaDevengadoInicial != null
        ? diaDevengadoInicial
        : diaDevengadoFinBalDesdeCalendarioArgentina()
    );
    setVencimiento(
      esEdicion && vencimientoInicial != null
        ? normalizarPlazoPago(vencimientoInicial)
        : 30
    );
    setComentarios(
      esEdicion ? comentariosNormalizadosParaEstado(comentariosInicial) : ""
    );
  }, [
    open,
    modo,
    sucursalIdInicial,
    proveedorIdInicial,
    gastoMensualInicial,
    diaDevengadoInicial,
    vencimientoInicial,
    comentariosInicial,
  ]);

  /** En alta, al cambiar entre mensual/eventual, se normaliza la UI sin persistir vacíos inválidos. */
  useEffect(() => {
    if (!open || modo !== "crear") return;
    if (gastoMensual) {
      setDiaDevengado(1);
      setVencimiento((prev) => normalizarPlazoPago(prev));
      return;
    }
    setDiaDevengado(diaDevengadoFinBalDesdeCalendarioArgentina());
    setVencimiento((prev) => normalizarPlazoPago(prev));
  }, [gastoMensual, open, modo]);

  const hermanosMismaProveedorSucursal = useMemo(() => {
    if (!proveedorId || !sucursalId) return [];
    return filasMismoGastoFinal.filter(
      (f) =>
        f.proveedorId === proveedorId &&
        f.sucursalId === sucursalId &&
        (modo === "crear" || !id || f.id !== id)
    );
  }, [filasMismoGastoFinal, proveedorId, sucursalId, modo, id]);

  const comentariosNorm = useMemo(() => comentariosNormModal(comentarios), [comentarios]);

  const comentarioObligatorioPorTripla = hermanosMismaProveedorSucursal.length > 0;
  const comentarioChocaConOtro = useMemo(() => {
    if (!comentarioObligatorioPorTripla) return false;
    return hermanosMismaProveedorSucursal.some(
      (f) => comentariosNormModal(f.comentarios) === comentariosNorm
    );
  }, [hermanosMismaProveedorSucursal, comentarioObligatorioPorTripla, comentariosNorm]);

  const hasChanges = useMemo(() => {
    if (modo !== "editar") return true;
    const comIni = comentariosNormalizadosParaEstado(comentariosInicial);
    return (
      proveedorId !== proveedorIdInicial ||
      sucursalId !== sucursalIdInicial ||
      gastoMensual !== gastoMensualInicial ||
      diaDevengado !== (diaDevengadoInicial ?? diaDevengado) ||
      vencimiento !== (vencimientoInicial ?? vencimiento) ||
      comentarios !== comIni
    );
  }, [
    modo,
    proveedorId,
    proveedorIdInicial,
    sucursalId,
    sucursalIdInicial,
    gastoMensual,
    gastoMensualInicial,
    diaDevengado,
    diaDevengadoInicial,
    vencimiento,
    vencimientoInicial,
    comentarios,
    comentariosInicial,
  ]);

  const disabledSubmit = useMemo(() => {
    if (saving) return true;
    if (!sucursalId || !proveedorId) return true;
    if (gastoMensual && (!Number.isInteger(vencimiento) || vencimiento < 0 || vencimiento > 30)) {
      return true;
    }
    if (modo === "editar" && (!id || !hasChanges)) return true;
    if (comentarioObligatorioPorTripla && comentariosNorm === "") return true;
    if (comentarioChocaConOtro) return true;
    return false;
  }, [
    saving,
    sucursalId,
    proveedorId,
    modo,
    id,
    hasChanges,
    comentarioObligatorioPorTripla,
    comentariosNorm,
    comentarioChocaConOtro,
    gastoMensual,
    vencimiento,
  ]);

  useEffect(() => {
    if (!open) return;
    if (proveedorId && !proveedoresOpciones.some((p) => p.id === proveedorId)) {
      setProveedorId("");
    }
  }, [open, proveedorId, proveedoresOpciones]);

  function comentariosParaPersistir(): string | null {
    const t = comentarios.trim().toLocaleUpperCase("es-AR");
    return t === "" ? null : t;
  }

  async function handleSubmit() {
    if (disabledSubmit) return;
    setSaving(true);
    try {
      if (modo === "crear") {
        const r = await crearFinBalGastoFinalAction({
          gastoId,
          proveedorId,
          sucursalId,
          gastoMensual,
          diaDevengado: gastoMensual ? diaDevengado : null,
          vencimiento: gastoMensual ? vencimiento : null,
          comentarios: comentariosParaPersistir(),
        });
        if (!r.ok) {
          toast.error(r.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Gasto final creado correctamente.");
      } else {
        const r = await editarFinBalGastoFinalAction({
          id: id!,
          proveedorId,
          sucursalId,
          gastoMensual,
          diaDevengado: gastoMensual ? diaDevengado : null,
          vencimiento: gastoMensual ? vencimiento : null,
          comentarios: comentariosParaPersistir(),
        });
        if (!r.ok) {
          toast.error(r.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Gasto final actualizado correctamente.");
      }
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  const titulo = modo === "crear" ? "Nuevo Gasto Final" : "Editar Gasto Final";

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
        className="max-w-xl"
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
              TIPO DE GASTO
            </span>
            <Select
              value={gastoMensual ? "mensual" : "eventual"}
              onValueChange={(v) => setGastoMensual(v === "mensual")}
              disabled={saving}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                <SelectItem value="mensual">MENSUAL</SelectItem>
                <SelectItem value="eventual">EVENTUAL</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              SUCURSAL
            </span>
            <Select
              value={sucursalId || undefined}
              onValueChange={setSucursalId}
              disabled={saving || sucursales.length === 0}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="SELECCIONAR SUCURSAL" />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
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
              PROVEEDOR
            </span>
            <Select
              value={proveedorId || undefined}
              onValueChange={setProveedorId}
              disabled={saving || !sucursalId || proveedoresOpciones.length === 0}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="SELECCIONAR PROVEEDOR" />
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
              DÍA DEVENGADO
            </span>
            <Select
              value={gastoMensual ? String(diaDevengado) : undefined}
              onValueChange={(v) => setDiaDevengado(Number(v))}
              disabled={saving || !gastoMensual}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder={gastoMensual ? "SELECCIONAR DÍA" : "VACÍO (TIPO EVENTUAL)"} />
              </SelectTrigger>
              <SelectContent className="select-content-filtro max-h-60" position="popper" side="bottom" align="start">
                {diasOpciones.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              PLAZO DE PAGO
            </span>
            <Select
              value={gastoMensual ? String(vencimiento) : undefined}
              onValueChange={(v) => setVencimiento(normalizarPlazoPago(Number(v)))}
              disabled={saving || !gastoMensual}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="VACÍO (TIPO EVENTUAL)">
                  {gastoMensual ? String(vencimiento) : "VACÍO (TIPO EVENTUAL)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="select-content-filtro max-h-60" position="popper" side="bottom" align="start">
                {plazoPagoOpciones.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              COMENTARIOS
            </span>
            <textarea
              value={comentarios}
              onChange={(e) =>
                setComentarios(e.target.value.toLocaleUpperCase("es-AR"))
              }
              disabled={saving}
              rows={1}
              maxLength={10000}
              placeholder="TEXTO LIBRE (OPCIONAL)"
              spellCheck={false}
              autoComplete="off"
              className={cn(
                SELECT_TRIGGER_FILTER_CLASS,
                "resize-none overflow-y-auto leading-snug",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            <span className="text-xs text-muted-foreground">{comentarios.length} / 10000</span>
            {comentarioObligatorioPorTripla ? (
              <p className="text-xs text-muted-foreground">
                Ya hay otra fila con el mismo proveedor y sucursal para este gasto. Complete COMENTARIOS con un texto
                distinto para poder guardar.
              </p>
            ) : null}
            {comentarioChocaConOtro ? (
              <p className="text-xs text-destructive">
                Ese texto en COMENTARIOS coincide con otra fila del mismo proveedor y sucursal. Cambie el texto.
              </p>
            ) : null}
          </label>
        </div>
      </AppModal>
    </Dialog>
  );
}
