"use client";

import { useEffect, useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { fmtPrecio, fmtTituloPalabras } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listarHistoricoMontosGastoFinalBalanceAction } from "@/actions/finBalGastoMensualBalance";
import type { HistoricoMontoGastoFinalBalanceItem } from "@/services/finBalGastoMensualBalance.service";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gastoFinalId: string | null;
  /** Subtítulo / contexto (ej. gasto · proveedor · sucursal). */
  descripcion: string;
}

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
}

export default function BalanceMensualGastoHistoricoModal({
  open,
  onOpenChange,
  gastoFinalId,
  descripcion,
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

  const maxMonto = serie.reduce((m, p) => Math.max(m, p.monto), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras("Evolución mensual del gasto")}
        size="xl"
        className="max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(28rem,72vh)]"
        scrollBody={false}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
          <p className="shrink-0 text-xs text-muted-foreground">{descripcion}</p>
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
          {serie.length > 0 ? (
            <div className="flex min-h-[14rem] min-w-0 flex-1 flex-col gap-3">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Monto por mes
              </div>
              <div className="flex min-h-[11rem] items-end gap-1.5 overflow-x-auto border-b border-border px-1 pb-1">
                {serie.map((p) => {
                  const pxAlt =
                    maxMonto > 0
                      ? Math.round((p.monto / maxMonto) * 128)
                      : 0;
                  const alturaPx = p.monto > 0 ? Math.max(pxAlt, 6) : 2;
                  return (
                    <div
                      key={`${p.anio}-${p.mes}`}
                      className="flex w-12 shrink-0 flex-col items-stretch gap-1 w-14"
                    >
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
                      <span className="text-center text-[9px] leading-tight text-muted-foreground">
                        {p.etiquetaMes}
                      </span>
                      <span className="text-center text-[9px] tabular-nums text-foreground">
                        {fmtMonto(p.monto)}
                      </span>
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
