"use client";

import { BarChart2 } from "lucide-react";
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
import type { BalanceMensualFilaDetalleGasto } from "@/lib/balanceMensualDetalle";

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
  /** Total del gasto (suma de líneas mostradas) para % sobre gasto. */
  totalGastoAgregado: number;
  /** Total del rubro en la sección (modal 1) para % sobre rubro. */
  totalRubroSeccion: number;
  /** Denominador por línea: mapa tipo → total en celda; si falta, se usa 0 y "—". */
  totalPorTipo: (tipoGastoNombre: string) => number;
  filas: BalanceMensualFilaDetalleGasto[];
  notaInformativa?: string | null;
  onAbrirHistorico: (payload: { gastoFinalId: string; etiqueta: string }) => void;
}

export default function BalanceMensualDetalleGastosRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  tipo,
  totalGastoAgregado,
  totalRubroSeccion,
  totalPorTipo,
  filas,
  notaInformativa,
  onAbrirHistorico,
}: Props) {
  const total = filas.reduce((a, r) => a + r.monto, 0);
  const etiquetaPctTipo = "% SOBRE TIPO";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras(titulo)}
        size="xl"
        className="max-w-5xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(36rem,70vh)]"
        scrollBody={false}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 text-sm">
          <p className="shrink-0 text-xs text-muted-foreground">{subtitulo}</p>
          {notaInformativa ? (
            <p className="shrink-0 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {notaInformativa}
            </p>
          ) : null}
          <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
              <Table
                variant="compact"
                scrollX={false}
                className="tabla-gestion-compacta table-fixed w-full min-w-[44rem]"
              >
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[18%]" />
                  <col className="w-[17%]" />
                  <col className="w-[17%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>DETALLE</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title="Participación de la línea sobre el total del gasto (nombre) en esta vista."
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">GASTO</span>
                    </TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title="Participación sobre el total del rubro en esta sección."
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">RUBRO</span>
                    </TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title={`Participación sobre el total del tipo de gasto en esta columna (${tipo === "variables" ? "variables + reparto proporcional del pool" : "fijos + reparto proporcional del pool"} en sucursal).`}
                    >
                      <span className="block">{etiquetaPctTipo}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.length === 0 ? (
                    <EmptyTableRow colSpan={5} message="No hay líneas para este gasto." />
                  ) : (
                    filas.map((r) => {
                      const denomTipo = totalPorTipo(r.tipoGastoNombre);
                      return (
                        <TableRow key={r.imputacionId}>
                          <TableCell className={cn(CELL_MIN, "celda-datos align-middle")}>
                            <span className="block text-xs text-muted-foreground">
                              {r.proveedorNombre} · {r.sucursalNombre}
                            </span>
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            <div className="flex w-full items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label={`Ver evolución mensual — ${r.gastoNombre}`}
                                onClick={() =>
                                  onAbrirHistorico({
                                    gastoFinalId: r.gastoFinalId,
                                    etiqueta: `${r.gastoNombre} — ${r.proveedorNombre} · ${r.sucursalNombre}`,
                                  })
                                }
                              >
                                <BarChart2 className="h-4 w-4" aria-hidden />
                              </Button>
                              <span>{fmtMonto(r.monto)}</span>
                            </div>
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            {fmtPctDeTotal(r.monto, totalGastoAgregado)}
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            {fmtPctDeTotal(r.monto, totalRubroSeccion)}
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle")}>
                            {fmtPctDeTotal(r.monto, denomTipo)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {filas.length > 0 ? (
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
