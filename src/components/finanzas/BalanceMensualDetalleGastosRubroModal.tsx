"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  totalCvCelda: number;
  totalCfCelda: number;
  filas: BalanceMensualFilaDetalleGasto[];
  /** Texto aclaratorio (p. ej. reparto de centros de costo). */
  notaInformativa?: string | null;
}

export default function BalanceMensualDetalleGastosRubroModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  tipo,
  totalCvCelda,
  totalCfCelda,
  filas,
  notaInformativa,
}: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) setExpandedIdx(null);
  }, [open, titulo]);

  const total = useMemo(() => filas.reduce((a, r) => a + r.monto, 0), [filas]);
  const totalTipoCelda = tipo === "variables" ? totalCvCelda : totalCfCelda;
  const etiquetaTotalesTipo = tipo === "variables" ? "VARIABLES" : "FIJOS";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setExpandedIdx(null);
        onOpenChange(next);
      }}
    >
      <AppModal
        title={titulo}
        size="xl"
        className="sm:max-w-4xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(34rem,65vh)]"
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
              <Table variant="compact" scrollX={false} className="tabla-gestion-compacta table-fixed w-full min-w-[38rem]">
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "21%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={CELL_MIN}>DETALLE</TableHead>
                    <TableHead className={cn(TH_NUM, CELL_MIN)}>MONTO</TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title="Participación de la línea sobre el total del rubro en esta vista."
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">DENTRO DEL RUBRO</span>
                    </TableHead>
                    <TableHead
                      className={cn(TH_NUM, CELL_MIN, "text-[10px] leading-tight")}
                      title={`Participación sobre el total de costos ${tipo === "variables" ? "variables" : "fijos"} de esta columna del balance.`}
                    >
                      <span className="block">% SOBRE GASTOS</span>
                      <span className="block">TOTALES {etiquetaTotalesTipo}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.length === 0 ? (
                    <EmptyTableRow colSpan={4} message="No hay líneas para este rubro." />
                  ) : (
                    filas.map((r, i) => {
                      const expandida = expandedIdx === i;
                      return (
                        <Fragment key={`${r.gastoNombre}-${r.sucursalNombre}-${r.proveedorNombre}-${i}`}>
                          <TableRow>
                            <TableCell className={cn(CELL_MIN, "celda-datos align-middle")}>
                              <span className="font-medium text-foreground">{r.gastoNombre}</span>
                            </TableCell>
                            <TableCell className={cn(TD_NUM, "align-middle")}>
                              <div className="grid w-full grid-cols-[1fr_2.25rem] items-center justify-end gap-x-1">
                                <span>{fmtMonto(r.monto)}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
                                    expandida && "bg-muted text-foreground"
                                  )}
                                  aria-expanded={expandida}
                                  aria-label={
                                    expandida
                                      ? "Ocultar detalle ampliado de la línea"
                                      : "Ampliar información de la línea"
                                  }
                                  onClick={() => setExpandedIdx(expandida ? null : i)}
                                >
                                  <PanelRightOpen className="h-4 w-4" aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className={cn(TD_NUM, "align-middle")}>
                              {fmtPctDeTotal(r.monto, total)}
                            </TableCell>
                            <TableCell className={cn(TD_NUM, "align-middle")}>
                              {fmtPctDeTotal(r.monto, totalTipoCelda)}
                            </TableCell>
                          </TableRow>
                          {expandida ? (
                            <TableRow className="bg-muted/35 hover:bg-muted/35">
                              <TableCell colSpan={4} className="celda-datos px-3 py-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Detalle: </span>
                                {r.proveedorNombre} · {r.sucursalNombre} · {r.rubroNombre} · {r.tipoGastoNombre}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
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
