"use client";

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
import { fmtPrecio, fmtPctDeTotal, fmtTituloPalabras } from "@/lib/format";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import type { BalanceMensualFilaDetalleGasto } from "@/lib/balanceMensualDetalle";

const TH_NUM = "text-right whitespace-nowrap";
const TH_PCT = "text-center whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";
const CELL_MIN = "min-w-0";

/** % centrado + barra de magnitud (mismo criterio que otros modales de balance). */
function CeldaPorcentajeConBarra({
  parte,
  denominador,
}: {
  parte: number;
  denominador: number;
}) {
  const texto = fmtPctDeTotal(parte, denominador);
  const pct = denominador > 0 ? (parte / denominador) * 100 : 0;
  const barW = denominador > 0 && parte > 0 ? Math.min(100, Math.max(pct, 3)) : 0;

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1.5 py-0.5">
      <div className="flex justify-center tabular-nums">
        <span>{texto}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-sm bg-muted/60"
        title={texto !== "—" ? `${texto} sobre el total de referencia` : undefined}
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
  /** Total del gasto (suma de líneas mostradas) para % sobre gasto. */
  totalGastoAgregado: number;
  /** Total del rubro en la sección (modal 1) para % sobre rubro. */
  totalRubroSeccion: number;
  /** Denominador por línea: mapa tipo → total en celda; si falta, se usa 0 y "—". */
  totalPorTipo: (tipoGastoNombre: string) => number;
  filas: BalanceMensualFilaDetalleGasto[];
  notaInformativa?: string | null;
  onAbrirHistorico: (payload: { gastoFinalId: string; etiqueta: string }) => void;
  onVolver?: () => void;
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
  onVolver,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras(titulo)}
        size="xl"
        className="max-w-5xl"
        bodyClassName="flex flex-col min-h-0 max-h-[min(36rem,70vh)]"
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
                      className={cn(TH_PCT, CELL_MIN, "text-[10px] leading-tight")}
                      title="Participación de la línea sobre el total del gasto (nombre) en esta vista."
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">GASTO</span>
                    </TableHead>
                    <TableHead
                      className={cn(TH_PCT, CELL_MIN, "text-[10px] leading-tight")}
                      title="Participación sobre el total del rubro en esta sección."
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">RUBRO</span>
                    </TableHead>
                    <TableHead
                      className={cn(TH_PCT, CELL_MIN, "text-[10px] leading-tight")}
                      title={`Participación sobre el total de ${tipo === "variables" ? "costos variables" : "costos fijos"} de esta columna del balance (incluye reparto proporcional del pool en sucursal).`}
                    >
                      <span className="block">% SOBRE</span>
                      <span className="block">
                        {tipo === "variables" ? "COSTOS VARIABLES" : "COSTOS FIJOS"}
                      </span>
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
                            <span className="block text-xs text-black">
                              {r.proveedorNombre} · {r.sucursalNombre}
                            </span>
                          </TableCell>
                          <TableCell className={cn(TD_NUM, "align-middle px-2")}>
                            <div className="grid w-full grid-cols-[2.25rem_1fr] items-center gap-x-2">
                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                                    "!h-7 !w-7 min-h-7 min-w-7 shrink-0 !p-0 [&_svg]:size-3.5",
                                  )}
                                  aria-label={`Ver evolución mensual — ${r.gastoNombre}`}
                                  onClick={() =>
                                    onAbrirHistorico({
                                      gastoFinalId: r.gastoFinalId,
                                      etiqueta: `${r.gastoNombre} — ${r.proveedorNombre} · ${r.sucursalNombre}`,
                                    })
                                  }
                                >
                                  <ChartNoAxesColumn className="size-3.5" aria-hidden />
                                </Button>
                              </div>
                              <span className="min-w-0 text-right tabular-nums text-foreground">
                                {fmtMonto(r.monto)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              TD_NUM,
                              "align-middle whitespace-normal !px-2 !text-center",
                            )}
                          >
                            <CeldaPorcentajeConBarra
                              parte={r.monto}
                              denominador={totalGastoAgregado}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              TD_NUM,
                              "align-middle whitespace-normal !px-2 !text-center",
                            )}
                          >
                            <CeldaPorcentajeConBarra
                              parte={r.monto}
                              denominador={totalRubroSeccion}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              TD_NUM,
                              "align-middle whitespace-normal !px-2 !text-center",
                            )}
                          >
                            <CeldaPorcentajeConBarra parte={r.monto} denominador={denomTipo} />
                          </TableCell>
                        </TableRow>
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
