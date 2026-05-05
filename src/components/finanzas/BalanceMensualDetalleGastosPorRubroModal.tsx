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
                  {gastos.length === 0 ? (
                    <EmptyTableRow colSpan={4} message="No hay gastos para este rubro." />
                  ) : (
                    gastos.map((g) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
