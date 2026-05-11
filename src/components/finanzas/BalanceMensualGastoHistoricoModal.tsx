"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { fmtPrecio, fmtTituloPalabras } from "@/lib/format";
import { TEXT_SUCCESS_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import {
  listarHistoricoMontosGastoFinalBalanceAction,
  listarSerieHistorialFilaBalanceMensualAction,
} from "@/actions/finBalGastoMensualBalance";
import type { HistoricoMontoGastoFinalBalanceItem } from "@/services/finBalGastoMensualBalance.service";
import type { ColumnaSerieHistorialFila } from "@/services/balanceMensualHistorialFila.service";
import {
  ETIQUETA_FILA_BALANCE_HISTORIAL,
  type BalanceMensualFilaHistorialId,
} from "@/lib/balanceMensualHistorialFila";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gastoFinalId: string | null;
  /**
   * Serie del **total de la fila** de la grilla (misma columna y reglas de resumen).
   * Excluyente con `gastoFinalId`: la UI abre un modo u otro.
   */
  historialFila?: {
    filaConceptoId: BalanceMensualFilaHistorialId;
    columna: ColumnaSerieHistorialFila;
    mesFin: number;
    anioFin: number;
  } | null;
  /** Si viene definido, sustituye el título automático del gasto o de la fila. */
  tituloOverride?: string | null;
  /** Clasificación del gasto en el balance (título del modal). */
  costoClase?: "fijos" | "variables";
  /** Con acceso desde costo variable/fijo en grilla: clic en barra abre desglose por rubro de ese mes. */
  onSeleccionarMesEnGrafico?: (mes: number, anio: number) => void | Promise<void>;
  /** Navegación hacia el modal anterior (ej. detalle de líneas). */
  onVolver?: () => void;
}

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
}

function fmtValorHistorialSerie(n: number, formato: "importe" | "porcentaje") {
  if (formato === "porcentaje") {
    if (n === 0) return "—";
    return `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  }
  return fmtMonto(n);
}

/** Variación vs. mes anterior; el porcentaje se muestra como entero (`Math.round`). */
type VariacionMesAnterior =
  | { kind: "sin_anterior" }
  | { kind: "sin_base" }
  | { kind: "flat" }
  | { kind: "up"; pct: number }
  | { kind: "down"; pct: number };

function variacionVsMesAnterior(
  montoAnterior: number | undefined,
  montoActual: number,
): VariacionMesAnterior {
  if (montoAnterior === undefined) return { kind: "sin_anterior" };
  if (montoAnterior === 0) {
    if (montoActual === 0) return { kind: "flat" };
    return { kind: "sin_base" };
  }
  const pctEntero = Math.round(
    ((montoActual - montoAnterior) / montoAnterior) * 100,
  );
  if (pctEntero === 0) return { kind: "flat" };
  if (pctEntero > 0) return { kind: "up", pct: pctEntero };
  return { kind: "down", pct: Math.abs(pctEntero) };
}

function CeldaVariacionPct({ variacion }: { variacion: VariacionMesAnterior }) {
  if (variacion.kind === "sin_anterior") {
    return (
      <span
        className="text-[9px] tabular-nums text-muted-foreground"
        aria-label="Sin mes anterior para comparar"
      >
        —
      </span>
    );
  }
  if (variacion.kind === "sin_base") {
    return (
      <span
        className="text-[9px] tabular-nums text-muted-foreground"
        aria-label="Sin monto en el mes anterior para calcular variación porcentual"
      >
        —
      </span>
    );
  }
  if (variacion.kind === "flat") {
    return (
      <span
        className="inline-flex items-center justify-center gap-0.5 text-[11px] font-medium tabular-nums text-foreground"
        aria-label="Variación respecto al mes anterior: 0 por ciento"
      >
        0%
      </span>
    );
  }
  if (variacion.kind === "up") {
    return (
      <span
        className="inline-flex items-center justify-center gap-0.5"
        aria-label={`Variación respecto al mes anterior: sube ${variacion.pct} por ciento`}
      >
        <ArrowUp
          className="h-3.5 w-3.5 shrink-0 text-destructive"
          strokeWidth={2.5}
          aria-hidden
        />
        <span className="text-[11px] font-medium tabular-nums text-foreground">
          {variacion.pct}%
        </span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center gap-0.5"
      aria-label={`Variación respecto al mes anterior: baja ${variacion.pct} por ciento`}
    >
      <ArrowDown
        className={cn("h-3.5 w-3.5 shrink-0", TEXT_SUCCESS_CLASS)}
        strokeWidth={2.5}
        aria-hidden
      />
      <span className="text-[11px] font-medium tabular-nums text-foreground">
        {variacion.pct}%
      </span>
    </span>
  );
}

function tituloHistorialGasto(costoClase?: "fijos" | "variables") {
  const base = "Historial gasto por mes";
  if (costoClase === "fijos") {
    return fmtTituloPalabras(`${base} - gasto fijo`);
  }
  if (costoClase === "variables") {
    return fmtTituloPalabras(`${base} - gasto variable`);
  }
  return fmtTituloPalabras(base);
}

export default function BalanceMensualGastoHistoricoModal({
  open,
  onOpenChange,
  gastoFinalId,
  historialFila = null,
  tituloOverride = null,
  costoClase,
  onSeleccionarMesEnGrafico,
  onVolver,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [serie, setSerie] = useState<HistoricoMontoGastoFinalBalanceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const formatoValor: "importe" | "porcentaje" =
    historialFila?.filaConceptoId === "mc" ? "porcentaje" : "importe";

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    if (historialFila) {
      startTransition(() => {
        void listarSerieHistorialFilaBalanceMensualAction({
          filaConceptoId: historialFila.filaConceptoId,
          columna: historialFila.columna,
          mesFin: historialFila.mesFin,
          anioFin: historialFila.anioFin,
        }).then((res) => {
          if (cancelled) return;
          if (!res.ok) {
            setError(res.error);
            setSerie([]);
            return;
          }
          setError(null);
          setSerie(res.data);
        });
      });
      return () => {
        cancelled = true;
      };
    }

    if (!gastoFinalId) {
      setSerie([]);
      setError(null);
      return undefined;
    }

    startTransition(() => {
      void listarHistoricoMontosGastoFinalBalanceAction({ gastoFinalId }).then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
          setSerie([]);
          return;
        }
        setError(null);
        setSerie(res.data);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, gastoFinalId, historialFila]);

  /** Siempre cronológico (mes antiguo → reciente); asegura eje del gráfico y variación vs. mes anterior. */
  const serieCronologica = useMemo(
    () =>
      [...serie].sort((a, b) => {
        if (a.anio !== b.anio) return a.anio - b.anio;
        return a.mes - b.mes;
      }),
    [serie],
  );

  const serieConVariacion = useMemo(
    () =>
      serieCronologica.map((p, i) => {
        const montoAnterior = i > 0 ? serieCronologica[i - 1].monto : undefined;
        return {
          ...p,
          variacion: variacionVsMesAnterior(montoAnterior, p.monto),
        };
      }),
    [serieCronologica],
  );

  const maxMonto = serieCronologica.reduce((m, p) => Math.max(m, p.monto), 0);

  const tituloModal =
    tituloOverride?.trim() ||
    (historialFila
      ? fmtTituloPalabras(
          `Historial por mes — ${ETIQUETA_FILA_BALANCE_HISTORIAL[historialFila.filaConceptoId]}` +
            (historialFila.filaConceptoId === "mc" ? " (%)" : ""),
        )
      : tituloHistorialGasto(costoClase));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={tituloModal}
        size="xl"
        className="max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(28rem,72vh)]"
        scrollBody={false}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onVolver) onVolver();
              else onOpenChange(false);
            }}
          >
            Volver
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
          {error ? (
            <p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {pending && serie.length === 0 && !error ? (
            <p className="text-xs text-muted-foreground">Cargando…</p>
          ) : null}
          {serie.length === 0 && !pending && !error && !historialFila ? (
            <p className="text-xs text-muted-foreground">No hay otros meses imputados para este gasto.</p>
          ) : null}
          {serieCronologica.length > 0 ? (
            <div className="flex min-h-[14rem] min-w-0 flex-1 flex-col gap-3">
              <div className="text-center text-[10px] font-medium uppercase tracking-wide text-black">
                {formatoValor === "porcentaje" ? "Porcentaje por mes" : "Monto por mes"}
              </div>
              <div className="flex min-h-[11rem] items-end gap-1.5 overflow-x-auto border-b border-border px-1 pb-1">
                {serieConVariacion.map((p) => {
                  const pxAlt =
                    maxMonto > 0
                      ? Math.round((p.monto / maxMonto) * 128)
                      : 0;
                  const alturaPx = p.monto > 0 ? Math.max(pxAlt, 6) : 2;
                  const barInteractive = Boolean(onSeleccionarMesEnGrafico);
                  return (
                    <div
                      key={`${p.anio}-${p.mes}`}
                      className="flex w-14 shrink-0 flex-col items-stretch gap-0.5"
                    >
                      {barInteractive ? (
                        <button
                          type="button"
                          className="flex h-36 w-full items-end justify-center rounded-sm bg-muted/25 px-0.5 outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Ver desglose por rubro en ${p.etiquetaMes} de ${p.anio}`}
                          title={`${p.etiquetaMes}: ${fmtValorHistorialSerie(p.monto, formatoValor)} — Clic para desglose`}
                          onClick={() => void onSeleccionarMesEnGrafico?.(p.mes, p.anio)}
                        >
                          <div
                            className={cn(
                              "w-[82%] rounded-t-sm",
                              p.monto > 0 ? "bg-[#0072BB]" : "bg-muted-foreground/20",
                            )}
                            style={{ height: `${alturaPx}px` }}
                            aria-hidden
                          />
                        </button>
                      ) : (
                        <div className="flex h-36 w-full items-end justify-center rounded-sm bg-muted/25 px-0.5">
                          <div
                            className={cn(
                              "w-[82%] rounded-t-sm",
                              p.monto > 0 ? "bg-[#0072BB]" : "bg-muted-foreground/20",
                            )}
                            style={{ height: `${alturaPx}px` }}
                            title={`${p.etiquetaMes}: ${fmtValorHistorialSerie(p.monto, formatoValor)}`}
                          />
                        </div>
                      )}
                      <span className="text-center text-[9px] leading-tight text-muted-foreground">
                        {p.etiquetaMes}
                      </span>
                      <span className="text-center text-[9px] tabular-nums text-foreground">
                        {fmtValorHistorialSerie(p.monto, formatoValor)}
                      </span>
                      <div className="flex min-h-[1rem] items-start justify-center">
                        <CeldaVariacionPct variacion={p.variacion} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
