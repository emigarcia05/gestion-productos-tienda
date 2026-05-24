"use client";

import type { KeyboardEvent } from "react";
import { Fragment } from "react";
import { ChartNoAxesColumn } from "lucide-react";
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
import TablaSubencabezadoSeccionRow from "@/components/shared/TablaSubencabezadoSeccionRow";
import { fmtPrecio, fmtPctDeTotal, fmtTituloPalabras } from "@/lib/format";
import {
  BALANCE_MODAL_BOTON_HISTORIAL_CLASS,
  BALANCE_MODAL_HISTORIAL_RUBRO_TITLE,
  BALANCE_MODAL_TD_HISTORIAL_CLASS,
  BALANCE_MODAL_TH_HISTORIAL_CLASS,
} from "@/lib/ui-classes";
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
  /** Evolución mensual por rubro (id representativo de mayor impacto en el rubro). */
  onAbrirHistoricoRubro: (rubroClave: string) => void;
  /** Si el rubro tiene al menos un gasto final vinculado para evolución mensual. */
  historialRubroDisponible: (rubroClave: string) => boolean;
  onVolver?: () => void;
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
  onAbrirHistoricoRubro,
  historialRubroDisponible,
  onVolver,
}: Props) {
  const totalTipoCelda = tipo === "variables" ? totalCvCelda : totalCfCelda;
  const etiquetaPctBase =
    tipo === "variables" ? "% SOBRE COSTOS VARIABLES" : "% SOBRE COSTOS FIJOS";

  function onFilaRubroKeyDown(e: KeyboardEvent<HTMLTableRowElement>, payload: ElegirRubroBalancePayload) {
    if (e.key === "Enter" || e.key === " ") {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      onElegirRubro(payload);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras(titulo)}
        size="xl"
        className="max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(32rem,62vh)]"
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
          {subtitulo ? (
            <p className="shrink-0 text-center text-xs font-medium uppercase tracking-wide text-black">
              {subtitulo}
            </p>
          ) : null}
          <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
              <Table
                variant="compact"
                scrollX={false}
                className="tabla-gestion-compacta table-fixed w-full min-w-[32rem]"
              >
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-[26%]" />
                  <col className="w-[26%]" />
                  <col className="w-11" />
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
                    <TableHead className={BALANCE_MODAL_TH_HISTORIAL_CLASS} scope="col" title="Evolución mensual">
                      <span className="inline-block px-0.5">Hist.</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secciones.length === 0 ||
                  secciones.every((s) => s.rubros.length === 0) ? (
                    <EmptyTableRow
                      colSpan={4}
                      message="No hay imputaciones para este concepto en el periodo."
                    />
                  ) : (
                    secciones.map((sec) => {
                      const totalBloque = sec.rubros.reduce((a, r) => a + r.monto, 0);
                      return (
                      <Fragment key={`${sec.etiquetaTipo}-${sec.tipoGastoNombre ?? "pool"}`}>
                        <TablaSubencabezadoSeccionRow
                          titulo={sec.etiquetaTipo}
                          colSpan={4}
                          totalBloque={totalBloque}
                        />
                        {sec.rubros.map((r) => {
                          const payload: ElegirRubroBalancePayload = {
                            rubro: r,
                            tipoGastoNombre: sec.tipoGastoNombre,
                            etiquetaTipo: sec.etiquetaTipo,
                          };
                          return (
                          <TableRow
                            key={`${sec.tipoGastoNombre ?? "r"}-${r.clave}`}
                            role="button"
                            tabIndex={0}
                            className="cursor-pointer hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            aria-label={`Ver gastos del rubro — ${r.etiqueta}`}
                            onClick={(ev) => {
                              if ((ev.target as HTMLElement).closest("button")) return;
                              onElegirRubro(payload);
                            }}
                            onKeyDown={(e) => onFilaRubroKeyDown(e, payload)}
                          >
                            <TableCell className={cn(CELL_MIN, "celda-datos align-middle !text-left")}>
                              <span className="font-medium text-foreground">{r.etiqueta}</span>
                            </TableCell>
                            <TableCell className={cn(TD_MONTO, "align-middle px-2 text-right")}>
                              <span className="tabular-nums text-foreground">{fmtMonto(r.monto)}</span>
                            </TableCell>
                            <TableCell
                              className={cn(
                                TD_MONTO,
                                "align-middle whitespace-normal !px-2 !text-center",
                              )}
                            >
                              <CeldaPorcentajeConBarra parte={r.monto} totalTipoCelda={totalTipoCelda} />
                            </TableCell>
                            <TableCell className={BALANCE_MODAL_TD_HISTORIAL_CLASS}>
                              <div className="flex justify-center py-0.5">
                                {historialRubroDisponible(r.clave) ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={BALANCE_MODAL_BOTON_HISTORIAL_CLASS}
                                    aria-label={`Ver evolución mensual — ${r.etiqueta}`}
                                    title={BALANCE_MODAL_HISTORIAL_RUBRO_TITLE}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAbrirHistoricoRubro(r.clave);
                                    }}
                                  >
                                    <ChartNoAxesColumn aria-hidden />
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
