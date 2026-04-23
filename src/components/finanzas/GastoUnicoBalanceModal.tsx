"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import MontoArInput from "@/components/shared/MontoArInput";
import {
  crearFinBalImputacionGastoUnicoAction,
  listarFinBalGastosFinalesNoMensualesAction,
} from "@/actions/finBalGastoMensualBalance";
import type { FinBalGastoFinalNoMensualListItem } from "@/services/finBalGastoMensualBalance.service";
import { montoArNormalizedStringToPesosIntRounded } from "@/lib/montoArMask";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  anio: number;
  onSuccess?: () => void;
}

type Vista = "lista" | "formulario";

export default function GastoUnicoBalanceModal({
  open,
  onOpenChange,
  mes,
  anio,
  onSuccess,
}: Props) {
  const [vista, setVista] = useState<Vista>("lista");
  const [items, setItems] = useState<FinBalGastoFinalNoMensualListItem[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [seleccion, setSeleccion] = useState<FinBalGastoFinalNoMensualListItem | null>(null);
  const [montoNorm, setMontoNorm] = useState("");
  const [pagadoNorm, setPagadoNorm] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const r = await listarFinBalGastosFinalesNoMensualesAction({ mes, anio });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo cargar el listado.");
        setItems([]);
        return;
      }
      setItems(r.data);
    } finally {
      setCargandoLista(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    if (!open) return;
    setVista("lista");
    setSeleccion(null);
    setMontoNorm("");
    setPagadoNorm("");
    void cargarLista();
  }, [open, mes, anio, cargarLista]);

  const montoPesosInt = useMemo(() => montoArNormalizedStringToPesosIntRounded(montoNorm), [montoNorm]);
  const pagadoPesosInt = useMemo(() => montoArNormalizedStringToPesosIntRounded(pagadoNorm), [pagadoNorm]);

  const disabledGuardar = useMemo(() => {
    if (guardando || !seleccion) return true;
    if (montoPesosInt < 1) return true;
    if (pagadoPesosInt < 0 || pagadoPesosInt > montoPesosInt) return true;
    return false;
  }, [guardando, seleccion, montoPesosInt, pagadoPesosInt]);

  async function handleGuardarImputacion() {
    if (!seleccion || disabledGuardar) return;
    setGuardando(true);
    try {
      const r = await crearFinBalImputacionGastoUnicoAction({
        gastoFinalId: seleccion.gastoFinalId,
        mes,
        anio,
        monto: montoPesosInt,
        pagado: pagadoPesosInt,
      });
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo guardar.");
        return;
      }
      toast.success("Imputación de gasto único registrada.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setGuardando(false);
    }
  }

  function irACargar(it: FinBalGastoFinalNoMensualListItem) {
    setSeleccion(it);
    setMontoNorm("");
    setPagadoNorm("");
    setVista("formulario");
  }

  function volverALista() {
    setSeleccion(null);
    setMontoNorm("");
    setPagadoNorm("");
    setVista("lista");
    void cargarLista();
  }

  const tituloModal =
    vista === "lista" ? "Gasto único" : "Cargar gasto único";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (guardando && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={tituloModal}
        size="lg"
        className="sm:max-w-xl"
        padding="sm"
        actions={
          vista === "lista" ? (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={guardando} onClick={volverALista}>
                Volver
              </Button>
              <Button type="button" disabled={disabledGuardar} onClick={() => void handleGuardarImputacion()}>
                Guardar
              </Button>
            </div>
          )
        }
      >
        <div className="grid min-h-0 gap-3 text-sm">
          {vista === "lista" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Gastos del catálogo con periodicidad <span className="font-medium text-foreground">GASTO ÚNICO</span>
                . Periodo: <span className="font-medium text-foreground">{mes}/{anio}</span>.
              </p>
              <div className="max-h-[min(60vh,28rem)] overflow-y-auto rounded-md border border-border">
                {cargandoLista ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                    Cargando…
                  </div>
                ) : items.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No hay gastos únicos en el catálogo.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((it) => (
                      <li
                        key={it.gastoFinalId}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{it.gastoNombre}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {it.tipoGastoNombre} · {it.proveedorNombre} · {it.sucursalNombre}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {it.rubroNombre} · Día {it.diaDevengado}
                          </div>
                          {it.gastoFinalComentarios ? (
                            <div
                              className="mt-0.5 line-clamp-2 break-words text-[11px] leading-snug text-muted-foreground"
                              title={it.gastoFinalComentarios}
                            >
                              ({it.gastoFinalComentarios})
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0"
                          disabled={it.yaImputadoEnPeriodo}
                          title={
                            it.yaImputadoEnPeriodo
                              ? "Ya hay imputación en este periodo"
                              : "Cargar monto y pagado"
                          }
                          onClick={() => irACargar(it)}
                        >
                          {it.yaImputadoEnPeriodo ? "Ya cargado" : "Cargar"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : seleccion ? (
            <div className="grid gap-4 px-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-fit gap-1 px-2 text-muted-foreground hover:text-foreground"
                disabled={guardando}
                onClick={volverALista}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Lista
              </Button>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
                <div className="font-medium text-foreground">{seleccion.gastoNombre}</div>
                <div className="text-xs">
                  {seleccion.proveedorNombre} · {seleccion.sucursalNombre}
                </div>
                <div className="text-xs">
                  {seleccion.tipoGastoNombre} · {seleccion.rubroNombre} · Día {seleccion.diaDevengado}
                </div>
              </div>
              <label className="flex w-full flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Monto <span className="text-destructive">*</span>
                </span>
                <MontoArInput
                  valueNormalized={montoNorm}
                  onValueNormalizedChange={setMontoNorm}
                  disabled={guardando}
                  autoFocus
                  aria-label="Monto en pesos"
                />
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Pagado <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
                </span>
                <MontoArInput
                  valueNormalized={pagadoNorm}
                  onValueNormalizedChange={setPagadoNorm}
                  disabled={guardando}
                  aria-label="Importe ya pagado"
                />
              </label>
              <p className="text-[11px] text-muted-foreground">
                Si no ingresás pagado, se guarda en cero. El pagado no puede superar el monto.
              </p>
            </div>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
