"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { fmtPrecio, fmtTituloPalabras } from "@/lib/format";
import { TEXT_SUCCESS_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { listarHistoricoMontosGastoFinalBalanceAction } from "@/actions/finBalGastoMensualBalance";
import type { HistoricoMontoGastoFinalBalanceItem } from "@/services/finBalGastoMensualBalance.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gastoFinalId: string | null;
  /** Con acceso desde costo variable/fijo en grilla: clic en barra abre desglose por rubro de ese mes. */
  onSeleccionarMesEnGrafico?: (mes: number, anio: number) => void | Promise<void>;
  /** Navegación hacia el modal anterior (ej. detalle de líneas). */
  onVolver?: () => void;
}

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
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

export default function BalanceMensualGastoHistoricoModal({
  open,
  onOpenChange,
  gastoFinalId,
  onSeleccionarMesEnGrafico,
  onVolver,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [serie, setSerie] = useState<HistoricoMontoGastoFinalBalanceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !gastoFinalId) return undefined;

    let cancelled = false;
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
  }, [open, gastoFinalId]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras("Evolución mensual del gasto")}
        size="xl"
        className="max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(28rem,72vh)]"
        scrollBody={false}
        actions={
          <>
            {onVolver ? (
              <Button type="button" variant="outline" onClick={onVolver}>
                Volver
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </>
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
          {serie.length === 0 && !pending && !error ? (
            <p className="text-xs text-muted-foreground">No hay otros meses imputados para este gasto.</p>
          ) : null}
          {serieCronologica.length > 0 ? (
            <div className="flex min-h-[14rem] min-w-0 flex-1 flex-col gap-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Monto por mes
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
                          title={`${p.etiquetaMes}: ${fmtMonto(p.monto)} — Clic para desglose`}
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
                            title={`${p.etiquetaMes}: ${fmtMonto(p.monto)}`}
                          />
                        </div>
                      )}
                      <span className="text-center text-[9px] leading-tight text-muted-foreground">
                        {p.etiquetaMes}
                      </span>
                      <span className="text-center text-[9px] tabular-nums text-foreground">
                        {fmtMonto(p.monto)}
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
