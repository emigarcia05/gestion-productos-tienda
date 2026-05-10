"use client";

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
import type { BalanceMensualGastoAgregado } from "@/lib/balanceMensualDetalle";

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

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
  totalRubroSeccion: number;
  gastos: BalanceMensualGastoAgregado[];
  onElegirGasto: (g: BalanceMensualGastoAgregado) => void;
}

function GastosComparativoBarras({
  gastos,
  maxMonto,
}: {
  gastos: BalanceMensualGastoAgregado[];
  maxMonto: number;
}) {
  return (
    <div
      className="flex min-w-0 flex-col gap-0 bg-muted/20 px-3 py-0"
      aria-label="Comparativo ilustrativo de montos por gasto"
    >
      <div
        className={cn(
          "sticky top-0 z-10 flex h-10 min-h-10 shrink-0 items-center border-b border-border bg-muted/20",
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Magnitud
        </span>
      </div>
      <div className="flex flex-col">
        {gastos.map((g) => {
          const pctBar = maxMonto > 0 ? (g.monto / maxMonto) * 100 : 0;
          const barWidth = g.monto > 0 ? Math.max(pctBar, 5) : 0;
          return (
            <div
              key={g.gastoNombre}
              className="flex min-h-10 flex-col justify-center gap-1 border-b border-border/50 py-2 last:border-b-0"
            >
              <div
                className="h-2.5 w-full overflow-hidden rounded-sm bg-muted/60"
                title={`${g.gastoNombre}: ${fmtMonto(g.monto)}`}
              >
                <div
                  className="h-full min-w-0 rounded-sm bg-primary"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="sr-only">
                {g.gastoNombre}, {fmtMonto(g.monto)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BalanceMensualDetalleGastosPorRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  tipo,
  totalCvCelda,
  totalCfCelda,
  totalRubroSeccion,
  gastos,
  onElegirGasto,
}: Props) {
  const total = gastos.reduce((a, g) => a + g.monto, 0);
  const totalTipoCelda = tipo === "variables" ? totalCvCelda : totalCfCelda;
  const etiquetaPctCf =
    tipo === "variables" ? "% SOBRE COSTOS VARIABLES" : "% SOBRE COSTOS FIJOS";
  const maxMonto = gastos.reduce((m, g) => Math.max(m, g.monto), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras(titulo)}
        size="xl"
        className="max-w-5xl"
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
            {gastos.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
                  <Table
                    variant="compact"
                    scrollX={false}
                    className="tabla-gestion-compacta table-fixed w-full min-w-[38rem]"
                  >
                    <colgroup>
                      <col style={{ width: "34%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "23%" }} />
                      <col style={{ width: "23%" }} />
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={CELL_MIN}>GASTO</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                        <TableHead
                          className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                          title="Participación del gasto sobre el total del rubro (en esta sección)."
                        >
                          <span className="block">% SOBRE</span>
                          <span className="block">RUBRO</span>
                        </TableHead>
                        <TableHead
                          className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                          title={`Participación sobre el total de ${tipo === "variables" ? "costos variables" : "costos fijos"} de esta columna del balance.`}
                        >
                          <span className="block">{etiquetaPctCf}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <EmptyTableRow colSpan={4} message="No hay gastos para este rubro." />
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[30%_70%] gap-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
                <div className="min-h-0 min-w-0 border-r border-border">
                  <GastosComparativoBarras gastos={gastos} maxMonto={maxMonto} />
                </div>
                <div className="min-h-0 min-w-0 overflow-x-auto">
                  <Table
                    variant="compact"
                    scrollX={false}
                    className="tabla-gestion-compacta table-fixed w-full min-w-[32rem]"
                  >
                    <colgroup>
                      <col style={{ width: "34%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "23%" }} />
                      <col style={{ width: "23%" }} />
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={CELL_MIN}>GASTO</TableHead>
                        <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                        <TableHead
                          className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                          title="Participación del gasto sobre el total del rubro (en esta sección)."
                        >
                          <span className="block">% SOBRE</span>
                          <span className="block">RUBRO</span>
                        </TableHead>
                        <TableHead
                          className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                          title={`Participación sobre el total de ${tipo === "variables" ? "costos variables" : "costos fijos"} de esta columna del balance.`}
                        >
                          <span className="block">{etiquetaPctCf}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastos.map((g) => (
                        <TableRow key={g.gastoNombre}>
                          <TableCell className={cn(CELL_MIN, "celda-datos align-middle")}>
                            <span className="font-medium text-foreground">{g.gastoNombre}</span>
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            <div className="flex w-full items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label={`Ver líneas del gasto — ${g.gastoNombre}`}
                                onClick={() => onElegirGasto(g)}
                              >
                                <PanelRightOpen className="h-4 w-4" aria-hidden />
                              </Button>
                              <span>{fmtMonto(g.monto)}</span>
                            </div>
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            {fmtPctDeTotal(g.monto, totalRubroSeccion)}
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            {fmtPctDeTotal(g.monto, totalTipoCelda)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          {gastos.length > 0 ? (
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
