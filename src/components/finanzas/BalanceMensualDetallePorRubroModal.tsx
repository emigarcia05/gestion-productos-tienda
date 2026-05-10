"use client";

import { Fragment } from "react";
import { PanelRightOpen } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { fmtPrecio, fmtPctDeTotal, fmtTituloPalabras } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  BalanceMensualSeccionTipoRubros,
  ElegirRubroBalancePayload,
} from "@/lib/balanceMensualDetalle";

const TH_CENTER = "text-center whitespace-nowrap";
const TD_MONTO = "celda-datos tabular-nums";
const CELL_MIN = "min-w-0";

function CeldaPorcentajeConBarra({
  parte,
  totalTipoCelda,
}: {
  parte: number;
  totalTipoCelda: number;
}) {
  const texto = fmtPctDeTotal(parte, totalTipoCelda);
  const pct = totalTipoCelda > 0 ? (parte / totalTipoCelda) * 100 : 0;
  const barW =
    totalTipoCelda > 0 && parte > 0 ? Math.min(100, Math.max(pct, 3)) : 0;

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1.5 py-0.5">
      <div className="flex justify-center tabular-nums">
        <span>{texto}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm bg-muted/60"
        title={texto !== "—" ? `${texto} sobre el total de esta columna` : undefined}
        aria-hidden
      >
        {barW > 0 ? (
          <div
            className="h-full rounded-sm bg-primary"
            style={{ width: `${barW}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo: string;
  tipo: "variables" | "fijos";
  totalCvCelda: number;
  totalCfCelda: number;
  secciones: BalanceMensualSeccionTipoRubros[];
  onElegirRubro: (payload: ElegirRubroBalancePayload) => void;
}

export default function BalanceMensualDetallePorRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  tipo,
  totalCvCelda,
  totalCfCelda,
  secciones,
  onElegirRubro,
}: Props) {
  const total = secciones.reduce((a, s) => a + s.rubros.reduce((b, r) => b + r.monto, 0), 0);
  const totalTipoCelda = tipo === "variables" ? totalCvCelda : totalCfCelda;
  const etiquetaPctBase =
    tipo === "variables" ? "% SOBRE COSTOS VARIABLES" : "% SOBRE COSTOS FIJOS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras(titulo)}
        size="xl"
        className="max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(32rem,62vh)]"
        scrollBody={false}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
          <p className="shrink-0 text-xs text-muted-foreground">{subtitulo}</p>
          <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
              <Table
                variant="compact"
                scrollX={false}
                className="tabla-gestion-compacta table-fixed w-full min-w-[32rem]"
              >
                <colgroup>
                  <col style={{ width: "44%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "28%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>RUBRO</TableHead>
                    <TableHead className={cn(TH_CENTER, CELL_MIN)}>MONTO</TableHead>
                    <TableHead
                      className={cn(TH_CENTER, CELL_MIN, "text-[10px] leading-tight")}
                      title={`Participación del rubro sobre el total de ${tipo === "variables" ? "costos variables" : "costos fijos"} de esta columna del balance.`}
                    >
                      <span className="block">{etiquetaPctBase}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secciones.length === 0 ||
                  secciones.every((s) => s.rubros.length === 0) ? (
                    <EmptyTableRow
                      colSpan={3}
                      message="No hay imputaciones para este concepto en el periodo."
                    />
                  ) : (
                    secciones.map((sec) => (
                      <Fragment key={`${sec.etiquetaTipo}-${sec.tipoGastoNombre ?? "pool"}`}>
                        <TableRow className="bg-muted/45 hover:bg-muted/45">
                          <TableCell
                            colSpan={3}
                            className="celda-datos py-2 text-xs font-semibold uppercase tracking-wide text-foreground"
                          >
                            {fmtTituloPalabras(sec.etiquetaTipo.toLowerCase())}
                          </TableCell>
                        </TableRow>
                        {sec.rubros.map((r) => (
                          <TableRow key={`${sec.tipoGastoNombre ?? "r"}-${r.clave}`}>
                            <TableCell className={cn(CELL_MIN, "celda-datos align-middle !text-left")}>
                              <span className="font-medium text-foreground">{r.etiqueta}</span>
                            </TableCell>
                            <TableCell className={cn(TD_MONTO, "align-middle")}>
                              <div className="flex w-full items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label={`Ver gastos del rubro — ${r.etiqueta}`}
                                  onClick={() =>
                                    onElegirRubro({
                                      rubro: r,
                                      tipoGastoNombre: sec.tipoGastoNombre,
                                      etiquetaTipo: sec.etiquetaTipo,
                                    })
                                  }
                                >
                                  <PanelRightOpen className="h-4 w-4" aria-hidden />
                                </Button>
                                <span>{fmtMonto(r.monto)}</span>
                              </div>
                            </TableCell>
                            <TableCell
                              className={cn(
                                TD_MONTO,
                                "align-middle whitespace-normal !px-2 !text-center",
                              )}
                            >
                              <CeldaPorcentajeConBarra parte={r.monto} totalTipoCelda={totalTipoCelda} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {total > 0 ? (
            <div className="flex shrink-0 justify-between border-t border-border pt-2 text-xs text-muted-foreground">
              <span>Total</span>
              <span className="tabular-nums font-semibold text-foreground">{fmtMonto(total)}</span>
            </div>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
