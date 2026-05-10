"use client";

import type { KeyboardEvent } from "react";
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

function filaGastoPuedeAbrirDetalle(g: BalanceMensualGastoAgregado) {
  return g.cantidadLineas > 1 || g.tieneHistorialDisponible;
}

function CeldaMagnitudBarra({
  monto,
  maxMonto,
  etiqueta,
}: {
  monto: number;
  maxMonto: number;
  etiqueta: string;
}) {
  const pctBar = maxMonto > 0 ? (monto / maxMonto) * 100 : 0;
  const barWidth = monto > 0 ? Math.max(pctBar, 4) : 0;
  return (
    <div
      className="min-w-0 px-1"
      title={`${etiqueta}: ${fmtMonto(monto)} (respecto del mayor gasto de la lista)`}
    >
      <div className="h-2 w-full overflow-hidden rounded-sm bg-muted/60">
        <div
          className="h-full min-w-0 rounded-sm bg-primary"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
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

function TablaGastosRubro({
  tipo,
  totalTipoCelda,
  totalRubroSeccion,
  etiquetaPctCf,
  gastos,
  maxMonto,
  onElegirGasto,
}: {
  tipo: "variables" | "fijos";
  totalTipoCelda: number;
  totalRubroSeccion: number;
  etiquetaPctCf: string;
  gastos: BalanceMensualGastoAgregado[];
  maxMonto: number;
  onElegirGasto: (g: BalanceMensualGastoAgregado) => void;
}) {
  function onFilaKeyDown(e: KeyboardEvent<HTMLTableRowElement>, g: BalanceMensualGastoAgregado) {
    if (!filaGastoPuedeAbrirDetalle(g)) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onElegirGasto(g);
    }
  }

  return (
    <Table
      variant="compact"
      scrollX={false}
      className="tabla-gestion-compacta table-fixed w-full min-w-[44rem]"
    >
      <colgroup>
        <col style={{ width: "30%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "26%" }} />
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
          <TableHead
            className={cn(CELL_MIN, "!text-left text-[10px] leading-tight")}
            title="Comparación ilustrativa del monto respecto del mayor gasto de esta lista."
          >
            MAGNITUD
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gastos.length === 0 ? (
          <EmptyTableRow colSpan={5} message="No hay gastos para este rubro." />
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
                onClick={() => activa && onElegirGasto(g)}
                onKeyDown={(e) => onFilaKeyDown(e, g)}
              >
                <TableCell className={cn(CELL_MIN, "celda-datos align-middle text-left")}>
                  <span className="font-medium text-foreground">{g.gastoNombre}</span>
                </TableCell>
                <TableCell className={cn(TD_NUM, "align-middle")}>{fmtMonto(g.monto)}</TableCell>
                <TableCell className={cn(TD_NUM, "align-middle")}>
                  {fmtPctDeTotal(g.monto, totalRubroSeccion)}
                </TableCell>
                <TableCell className={cn(TD_NUM, "align-middle")}>
                  {fmtPctDeTotal(g.monto, totalTipoCelda)}
                </TableCell>
                <TableCell
                  className={cn(CELL_MIN, "celda-datos align-middle !text-left whitespace-normal")}
                >
                  <CeldaMagnitudBarra
                    monto={g.monto}
                    maxMonto={maxMonto}
                    etiqueta={g.gastoNombre}
                  />
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
            <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable]">
              <TablaGastosRubro
                tipo={tipo}
                totalTipoCelda={totalTipoCelda}
                totalRubroSeccion={totalRubroSeccion}
                etiquetaPctCf={etiquetaPctCf}
                gastos={gastos}
                maxMonto={maxMonto}
                onElegirGasto={onElegirGasto}
              />
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
