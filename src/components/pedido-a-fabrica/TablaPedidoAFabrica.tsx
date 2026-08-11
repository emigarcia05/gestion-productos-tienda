"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionClient from "@/components/shared/PaginacionClient";
import DetalleSucursalesPedidoAFabricaModal from "@/components/pedido-a-fabrica/DetalleSucursalesPedidoAFabricaModal";
import { cn } from "@/lib/utils";
import { fmtNumero, fmtPromVtaDiaria } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import {
  calcularCantSugeridaPedidoAFabrica,
  calcularStockEnDiasPedidoAFabrica,
} from "@/lib/pedidoAFabricaPromVta";
import type {
  DatosSucursalProductoPedidoAFabrica,
  ProductoPedidoAFabricaItem,
  SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";

interface Props {
  sucursales: SucursalPedidoAFabrica[];
  productos: ProductoPedidoAFabricaItem[];
  pagina: number;
  totalPaginas: number;
  onPaginaChange: (pagina: number) => void;
  loading?: boolean;
  emptyMessage: string;
  /** Días de entrega del proveedor seleccionado (`tiempo_entrega_en_dias`). */
  tiempoEntregaEnDias: number | null;
  /** Días de stockeo del filtro **TIEMPO STOCKEO** (null si vacío). */
  tiempoStockeo: number | null;
  /** Cant. a pedir por `codExt` (texto; solo dígitos). */
  cantAPedirByCodExt: Record<string, string>;
  onCantAPedirChange: (codExt: string, value: string) => void;
  onAplicarCantSugerida: (codExt: string, cantSugerida: number) => void;
}

const TD_NUM = "celda-datos celda-numero tabular-nums text-center";

/** Anchos fijos (suma 100 %). */
const PCT_DESC = 34;
const PCT_STOCK_UNIDADES = 10;
const PCT_STOCK_DIAS = 10;
const PCT_PROM_VTA = 10;
const PCT_CANT_SUGERIDA = 12;
const PCT_CANT_PEDIR = 12;
const PCT_TILDE = 6;
const PCT_INFO = 6;

const COL_COUNT = 8;

/** Solo dígitos (enteros ≥ 0); vacío permitido. */
function sanitizeCantAPedirInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Suma de STOCK ACTUAL y PROM. VTA. de todas las sucursales de la fila. */
function totalPorSucursales(
  producto: ProductoPedidoAFabricaItem,
  sucursales: SucursalPedidoAFabrica[]
): DatosSucursalProductoPedidoAFabrica {
  if (!producto.codTienda || sucursales.length === 0) {
    return { stockActual: null, promVta: null };
  }
  let stock = 0;
  let prom = 0;
  let tieneProm = false;
  for (const s of sucursales) {
    const d = producto.porSucursal[s.id];
    stock += d?.stockActual ?? 0;
    if (d?.promVta != null && !Number.isNaN(d.promVta)) {
      prom += d.promVta;
      tieneProm = true;
    }
  }
  return {
    stockActual: stock,
    promVta: tieneProm ? prom : null,
  };
}

/**
 * Grilla Pedido A Fáb.
 * **DESCRIPCIÓN** · **STOCK ACTUAL** (EN UNIDADES | EN DÍAS) · **PROM. VTA. P/ DÍA**
 * (suma sucursales) · **COMPRA** (CANT. SUGERIDA | CANT. PEDIR) · tilde · Info.
 */
export default function TablaPedidoAFabrica({
  sucursales,
  productos,
  pagina,
  totalPaginas,
  onPaginaChange,
  loading = false,
  emptyMessage,
  tiempoEntregaEnDias,
  tiempoStockeo,
  cantAPedirByCodExt,
  onCantAPedirChange,
  onAplicarCantSugerida,
}: Props) {
  const [detalleProducto, setDetalleProducto] =
    useState<ProductoPedidoAFabricaItem | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
        <Table variant="compact" scrollX={false}>
          <colgroup>
            <col style={{ width: `${PCT_DESC}%` }} />
            <col style={{ width: `${PCT_STOCK_UNIDADES}%` }} />
            <col style={{ width: `${PCT_STOCK_DIAS}%` }} />
            <col style={{ width: `${PCT_PROM_VTA}%` }} />
            <col style={{ width: `${PCT_CANT_SUGERIDA}%` }} />
            <col style={{ width: `${PCT_CANT_PEDIR}%` }} />
            <col style={{ width: `${PCT_TILDE}%` }} />
            <col style={{ width: `${PCT_INFO}%` }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="min-w-0 align-middle">
                DESCRIPCIÓN
              </TableHead>
              <TableHead
                colSpan={2}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
              >
                STOCK ACTUAL
              </TableHead>
              <TableHead
                rowSpan={2}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
              >
                PROM. VTA. P/ DÍA
              </TableHead>
              <TableHead
                colSpan={2}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
              >
                COMPRA
              </TableHead>
              <TableHead
                rowSpan={2}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
                aria-label="Confirmar cantidad sugerida"
              >
                <div className="flex w-full items-center justify-center">
                  <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                </div>
              </TableHead>
              <TableHead
                rowSpan={2}
                className="text-center align-middle tabla-bloque-secundario-head"
                aria-label="Detalle por sucursal"
              >
                <div className="flex w-full items-center justify-center">
                  <Info className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                </div>
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-center tabla-bloque-secundario-head-divider">
                EN UNIDADES
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head">
                EN DÍAS
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head-divider">
                CANT. SUGERIDA
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head">
                CANT. PEDIR
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={COL_COUNT}
                  className="celda-datos text-center text-muted-foreground"
                >
                  Cargando productos…
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COL_COUNT}
                  className="celda-datos text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => {
                const total = totalPorSucursales(p, sucursales);
                const stockUnidades = total.stockActual;
                const promVtaTotal = total.promVta;
                const stockDias = calcularStockEnDiasPedidoAFabrica(
                  stockUnidades,
                  promVtaTotal
                );
                const calc = calcularCantSugeridaPedidoAFabrica({
                  stockActual: stockUnidades ?? 0,
                  promVtaTotal: promVtaTotal ?? 0,
                  tiempoEntregaEnDias,
                  tiempoStockeo,
                });
                const cantSugerida = calc?.cantSugerida ?? null;
                const cantAPedirRaw = cantAPedirByCodExt[p.codExt] ?? "";

                return (
                  <TableRow key={p.codExt}>
                    <TableCell className="celda-datos min-w-0">
                      <span className="block truncate" title={p.descripcion}>
                        {p.descripcion}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {fmtNumero(stockUnidades)}
                    </TableCell>
                    <TableCell
                      className={cn(TD_NUM, "tabla-bloque-secundario-cell")}
                    >
                      {fmtNumero(stockDias)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {fmtPromVtaDiaria(promVtaTotal)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell-divider"
                      )}
                    >
                      {cantSugerida != null ? fmtNumero(cantSugerida) : ""}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "celda-datos celda-datos--flush-left celda-datos--flush-right tabla-bloque-secundario-cell p-0"
                      )}
                    >
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={cantAPedirRaw}
                        onChange={(e) =>
                          onCantAPedirChange(
                            p.codExt,
                            sanitizeCantAPedirInput(e.target.value)
                          )
                        }
                        aria-label={`Cantidad a pedir ${p.descripcion}`}
                        className="h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-h-0 w-full min-w-0 rounded-none border-0 bg-transparent px-1.5 text-center text-xs shadow-none focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila text-center tabla-bloque-secundario-cell-divider">
                      <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={cantSugerida == null}
                          onClick={() => {
                            if (cantSugerida == null) return;
                            onAplicarCantSugerida(p.codExt, cantSugerida);
                          }}
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label={`Confirmar cantidad sugerida: ${p.descripcion}`}
                        >
                          <Check
                            className={TABLE_ROW_ACTION_ICON_CLASS}
                            aria-hidden
                          />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila text-center tabla-bloque-secundario-cell">
                      <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetalleProducto(p)}
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label={`Ver detalle por sucursal: ${p.descripcion}`}
                        >
                          <Info
                            className={TABLE_ROW_ACTION_ICON_CLASS}
                            aria-hidden
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <PaginacionClient
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        onPaginaChange={onPaginaChange}
      />

      <DetalleSucursalesPedidoAFabricaModal
        open={detalleProducto != null}
        onOpenChange={(next) => {
          if (!next) setDetalleProducto(null);
        }}
        producto={detalleProducto}
        sucursales={sucursales}
        tiempoEntregaEnDias={tiempoEntregaEnDias}
        tiempoStockeo={tiempoStockeo}
      />
    </div>
  );
}
