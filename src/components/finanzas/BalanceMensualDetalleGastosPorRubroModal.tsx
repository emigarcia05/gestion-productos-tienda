"use client";

import type { KeyboardEvent } from "react";
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
import type { BalanceMensualGastoAgregado } from "@/lib/balanceMensualDetalle";

const TH_CENTER = "text-center whitespace-nowrap";
const TD_MONTO = "celda-datos tabular-nums";
const CELL_MIN = "min-w-0";

/** Mismo patrón que `BalanceMensualDetallePorRubroModal` (% centrado + barra debajo, relleno alineado a la izquierda). */
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

function filaGastoPuedeAbrirDetalle(g: BalanceMensualGastoAgregado) {
  return g.cantidadLineas > 1 || g.tieneHistorialDisponible;
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
  onAbrirHistorico: (payload: { gastoFinalId: string; etiqueta: string }) => void;
  onVolver?: () => void;
}

function TablaGastosRubro({
  tipo,
  totalTipoCelda,
  totalRubroSeccion,
  etiquetaPctCf,
  gastos,
  onElegirGasto,
  onAbrirHistorico,
}: {
  tipo: "variables" | "fijos";
  totalTipoCelda: number;
  totalRubroSeccion: number;
  etiquetaPctCf: string;
  gastos: BalanceMensualGastoAgregado[];
  onElegirGasto: (g: BalanceMensualGastoAgregado) => void;
  onAbrirHistorico: (payload: { gastoFinalId: string; etiqueta: string }) => void;
}) {
  function onFilaKeyDown(e: KeyboardEvent<HTMLTableRowElement>, g: BalanceMensualGastoAgregado) {
    if (!filaGastoPuedeAbrirDetalle(g)) return;
    if (e.key === "Enter" || e.key === " ") {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      onElegirGasto(g);
    }
  }

  return (
    <Table
      variant="compact"
      scrollX={false}
      className="tabla-gestion-compacta table-fixed w-full min-w-[40rem]"
    >
      <colgroup>
        <col className="w-[36%]" />
        <col className="w-[22%]" />
        <col className="w-[21%]" />
        <col className="w-[21%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(CELL_MIN, "!text-left")}>GASTO</TableHead>
          <TableHead className={cn(TH_CENTER, CELL_MIN)}>MONTO</TableHead>
          <TableHead
            className={cn(TH_CENTER, CELL_MIN, "text-[10px] leading-tight")}
            title="Participación del gasto sobre el total del rubro (en esta sección)."
          >
            <span className="block">% SOBRE</span>
            <span className="block">RUBRO</span>
          </TableHead>
          <TableHead
            className={cn(TH_CENTER, CELL_MIN, "text-[10px] leading-tight")}
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
          gastos.map((g) => {
            const activa = filaGastoPuedeAbrirDetalle(g);
            return (
              <TableRow
                key={g.gastoNombre}
                className={cn(
                  activa &&
                    "cursor-pointer hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
                role={activa ? "button" : undefined}
                tabIndex={activa ? 0 : undefined}
                aria-label={
                  activa ? `Abrir detalle e historial — ${g.gastoNombre}` : undefined
                }
                onClick={(ev) => {
                  if (!activa) return;
                  if ((ev.target as HTMLElement).closest("button")) return;
                  onElegirGasto(g);
                }}
                onKeyDown={(e) => onFilaKeyDown(e, g)}
              >
                <TableCell className={cn(CELL_MIN, "celda-datos align-middle !text-left")}>
                  <span className="font-medium text-foreground">{g.gastoNombre}</span>
                </TableCell>
                <TableCell className={cn(TD_MONTO, "align-middle px-2")}>
                  <div className="grid w-full grid-cols-[2.25rem_1fr] items-center gap-x-2">
                    <div className="flex justify-center">
                      {g.tieneHistorialDisponible && g.gastoFinalId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                            "!h-7 !w-7 min-h-7 min-w-7 shrink-0 !p-0 [&_svg]:size-3.5",
                          )}
                          aria-label={`Ver evolución mensual — ${g.gastoNombre}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAbrirHistorico({
                              gastoFinalId: g.gastoFinalId,
                              etiqueta: g.gastoNombre,
                            });
                          }}
                        >
                          <ChartNoAxesColumn className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                    <span className="min-w-0 text-right tabular-nums text-foreground">
                      {fmtMonto(g.monto)}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    TD_MONTO,
                    "align-middle whitespace-normal !px-2 !text-center",
                  )}
                >
                  <CeldaPorcentajeConBarra parte={g.monto} denominador={totalRubroSeccion} />
                </TableCell>
                <TableCell
                  className={cn(
                    TD_MONTO,
                    "align-middle whitespace-normal !px-2 !text-center",
                  )}
                >
                  <CeldaPorcentajeConBarra parte={g.monto} denominador={totalTipoCelda} />
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
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
  onAbrirHistorico,
  onVolver,
}: Props) {
  const totalTipoCelda = tipo === "variables" ? totalCvCelda : totalCfCelda;
  const etiquetaPctCf =
    tipo === "variables" ? "% SOBRE COSTOS VARIABLES" : "% SOBRE COSTOS FIJOS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title={fmtTituloPalabras(titulo)}
        size="xl"
        className="max-w-5xl"
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
              <TablaGastosRubro
                tipo={tipo}
                totalTipoCelda={totalTipoCelda}
                totalRubroSeccion={totalRubroSeccion}
                etiquetaPctCf={etiquetaPctCf}
                gastos={gastos}
                onElegirGasto={onElegirGasto}
                onAbrirHistorico={onAbrirHistorico}
              />
            </div>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
