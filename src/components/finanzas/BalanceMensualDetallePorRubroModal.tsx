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
import { fmtPrecio, fmtPctDeTotal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BalanceMensualRubroAgrupado } from "@/lib/balanceMensualDetalle";

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
  rubros: BalanceMensualRubroAgrupado[];
  onElegirRubro: (rubro: BalanceMensualRubroAgrupado) => void;
}

export default function BalanceMensualDetallePorRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  tipo,
  totalCvCelda,
  totalCfCelda,
  rubros,
  onElegirRubro,
}: Props) {
  const total = rubros.reduce((a, r) => a + r.monto, 0);
  const totalCvCf = totalCvCelda + totalCfCelda;
  const totalTipoCelda = tipo === "variables" ? totalCvCelda : totalCfCelda;
  const etiquetaTotalesTipo = tipo === "variables" ? "VARIABLES" : "FIJOS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={titulo}
        size="xl"
        className="sm:max-w-4xl"
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
              <Table variant="compact" scrollX={false} className="tabla-gestion-compacta table-fixed w-full min-w-[36rem]">
                <colgroup>
                  <col style={{ width: "34%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "23%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>DETALLE</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title="Participación sobre la suma de costos variables y fijos de esta columna del balance."
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">DENTRO DEL RUBRO</span>
                    </TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title={`Participación sobre el total de costos ${tipo === "variables" ? "variables" : "fijos"} de esta columna.`}
                    >
                      <span className="block">% SOBRE GASTOS</span>
                      <span className="block">TOTALES {etiquetaTotalesTipo}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rubros.length === 0 ? (
                    <EmptyTableRow
                      colSpan={4}
                      message="No hay imputaciones para este concepto en el periodo."
                    />
                  ) : (
                    rubros.map((r) => (
                      <TableRow key={r.clave}>
                        <TableCell className={cn(CELL_MIN, "celda-datos align-middle")}>
                          <span className="font-medium text-foreground">{r.etiqueta}</span>
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "align-middle")}>
                          <div className="grid w-full grid-cols-[1fr_2.25rem] items-center justify-end gap-x-1">
                            <span>{fmtMonto(r.monto)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Ver gastos del rubro — ${r.etiqueta}`}
                              onClick={() => onElegirRubro(r)}
                            >
                              <PanelRightOpen className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "align-middle")}>
                          {fmtPctDeTotal(r.monto, totalCvCf)}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "align-middle")}>
                          {fmtPctDeTotal(r.monto, totalTipoCelda)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {rubros.length > 0 ? (
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
