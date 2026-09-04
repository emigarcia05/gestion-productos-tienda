"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import MontoArInput from "@/components/shared/MontoArInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  guardarFinBalVtasCargaPeriodoAction,
  listarFinBalVtasPorMesAnioAction,
} from "@/actions/finBalVtas";
import {
  montoArNormalizedStringToPesosIntRounded,
  montoArPesosEnterosToNormalizedString,
} from "@/lib/montoArMask";
import { cn } from "@/lib/utils";
import type { SucursalGeneraBalanceOption } from "@/services/finBalVtas.service";

const MESES: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

const ANIO_MIN = 2026;
const ANIO_MAX = 2046;
const ANIOS = Array.from({ length: ANIO_MAX - ANIO_MIN + 1 }, (_, i) => ANIO_MIN + i);

type MontosPorSucursal = Record<string, string>;

function montosVacios(sucursales: SucursalGeneraBalanceOption[]): MontosPorSucursal {
  return Object.fromEntries(sucursales.map((s) => [s.id, ""]));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursales: SucursalGeneraBalanceOption[];
  /** Periodo de la fila. Mes/año fijos. */
  modo: "cargar" | "editar";
  initialMes: number;
  initialAnio: number;
}

export default function CrearFinBalVtasModal({
  open,
  onOpenChange,
  sucursales,
  modo,
  initialMes,
  initialAnio,
}: Props) {
  const router = useRouter();
  const tituloModal = modo === "editar" ? "EDITAR VENTAS" : "CARGAR VENTAS";
  const [mes, setMes] = useState(initialMes);
  const [anio, setAnio] = useState(initialAnio);
  const [montosPorSucursal, setMontosPorSucursal] = useState<MontosPorSucursal>(() =>
    montosVacios(sucursales)
  );
  const [cargandoPeriodo, setCargandoPeriodo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMes(initialMes);
    setAnio(initialAnio);
  }, [open, initialMes, initialAnio]);

  const cargarMontosPeriodo = useCallback(async () => {
    if (!open || sucursales.length === 0) {
      setMontosPorSucursal(montosVacios(sucursales));
      return;
    }

    setCargandoPeriodo(true);
    try {
      const r = await listarFinBalVtasPorMesAnioAction({ mes, anio });
      const map = montosVacios(sucursales);
      if (r.ok) {
        for (const row of r.data) {
          if (row.sucursalId in map) {
            map[row.sucursalId] = montoArPesosEnterosToNormalizedString(row.monto);
          }
        }
      } else {
        toast.error(r.error ?? "No se pudieron cargar las ventas del periodo.");
      }
      setMontosPorSucursal(map);
    } finally {
      setCargandoPeriodo(false);
    }
  }, [open, mes, anio, sucursales]);

  useEffect(() => {
    if (!open) return;
    void cargarMontosPeriodo();
  }, [open, cargarMontosPeriodo]);

  const lineasAGuardar = useMemo(() => {
    return sucursales
      .map((s) => {
        const norm = montosPorSucursal[s.id] ?? "";
        if (norm.trim() === "") return null;
        return { sucursalId: s.id, monto: montoArNormalizedStringToPesosIntRounded(norm) };
      })
      .filter((l): l is { sucursalId: string; monto: number } => l !== null);
  }, [sucursales, montosPorSucursal]);

  const puedeGuardar = useMemo(() => {
    if (saving || cargandoPeriodo) return false;
    if (sucursales.length === 0) return false;
    if (lineasAGuardar.length === 0) return false;
    if (mes < 1 || mes > 12) return false;
    if (anio < ANIO_MIN || anio > ANIO_MAX) return false;
    return lineasAGuardar.every((l) => l.monto >= 0);
  }, [saving, cargandoPeriodo, sucursales.length, lineasAGuardar, mes, anio]);

  function actualizarMonto(sucursalId: string, next: string) {
    setMontosPorSucursal((prev) => ({ ...prev, [sucursalId]: next }));
  }

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const r = await guardarFinBalVtasCargaPeriodoAction({
        mes,
        anio,
        lineas: lineasAGuardar,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      const n = r.data.guardados;
      toast.success(
        n === 1 ? "1 registro guardado." : `${n.toLocaleString("es-AR")} registros guardados.`
      );
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inputsDisabled = saving || cargandoPeriodo;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if ((saving || cargandoPeriodo) && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={tituloModal}
        size="md"
        className="max-w-md"
        actions={
          <>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="button" disabled={!puedeGuardar} onClick={() => void handleGuardar()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fin-bal-vtas-nueva-mes">Mes</Label>
              <Select
                value={String(mes)}
                onValueChange={(v) => setMes(Number(v))}
                disabled
              >
                <SelectTrigger id="fin-bal-vtas-nueva-mes" className="input-filtro-unificado w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro max-h-60">
                  {MESES.map((m) => (
                    <SelectItem key={m.valor} value={String(m.valor)}>
                      {m.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin-bal-vtas-nueva-anio">Año</Label>
              <Select
                value={String(anio)}
                onValueChange={(v) => setAnio(Number(v))}
                disabled
              >
                <SelectTrigger id="fin-bal-vtas-nueva-anio" className="input-filtro-unificado w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro max-h-60">
                  {ANIOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {cargandoPeriodo ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Cargando ventas del periodo…</span>
            </div>
          ) : sucursales.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay sucursales con genera_balance en true. Configurá al menos una en la base de datos.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sucursales.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[1.35fr_minmax(0,1fr)] gap-x-4 gap-y-2 items-center"
                >
                  <Label
                    htmlFor={`fin-bal-vtas-monto-${s.id}`}
                    className="text-right font-medium text-sm text-foreground"
                  >
                    {s.nombre}
                  </Label>
                  <MontoArInput
                    id={`fin-bal-vtas-monto-${s.id}`}
                    valueNormalized={montosPorSucursal[s.id] ?? ""}
                    onValueNormalizedChange={(next) => actualizarMonto(s.id, next)}
                    treatEmptyNormalizedAsBlank
                    disabled={inputsDisabled}
                    className={cn("border-primary w-full min-w-0")}
                    aria-label={`Monto ventas ${s.nombre}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
