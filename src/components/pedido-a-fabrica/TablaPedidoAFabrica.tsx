"use client";

import { useMemo, useState } from "react";
import { Check, Info, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionClient from "@/components/shared/PaginacionClient";
import EnteroStepperInput from "@/components/shared/EnteroStepperInput";
import DetalleSucursalesPedidoAFabricaModal from "@/components/pedido-a-fabrica/DetalleSucursalesPedidoAFabricaModal";
import { cn } from "@/lib/utils";
import { fmtNumero } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  TEXT_WARNING_CLASS,
} from "@/lib/ui-classes";
import {
  calcularStockAFechaLlegadaPedidoAFabrica,
  calcularStockEnDiasPedidoAFabrica,
  esStockQuebradoPedidoAFabrica,
  resolverCantSugeridaPedidoAFabrica,
} from "@/lib/pedidoAFabricaPromVta";
import { SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REPOSICION_FORMA_PEDIDO_FABRICA_LABELS,
  REPOSICION_FORMA_PEDIDO_FABRICA_VALUES,
  reposicionFormaPedidoFabricaSchema,
  type ReposicionFormaPedidoFabrica,
} from "@/lib/validations/reposicion";
import type {
  DatosSucursalProductoPedidoAFabrica,
  ProductoPedidoAFabricaItem,
  SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";

export type FiltroSiNoPedidoAFabrica = "" | "si" | "no";

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
  /** Filtro **PROD. VINCULADO** (`cod_tienda` en lista proveedor). */
  filtroProdVinculado: FiltroSiNoPedidoAFabrica;
  /** Filtro **STOCK QUEBRADO** (stock hasta llegada ≤ 0). */
  filtroStockQuebrado: FiltroSiNoPedidoAFabrica;
  /** Cant. a pedir por `codExt` (texto; solo dígitos). */
  cantAPedirByCodExt: Record<string, string>;
  formaPedirByCodExt: Record<string, ReposicionFormaPedidoFabrica>;
  onCantAPedirChange: (codExt: string, value: string) => void;
  onCantAPedirCommit: (codExt: string, value: string) => void;
  onFormaPedirChange: (codExt: string, forma: ReposicionFormaPedidoFabrica) => void;
  onAplicarCantSugerida: (codExt: string, cantSugerida: number) => void;
}

const TD_NUM = "celda-datos celda-numero tabular-nums text-center";

/** Anchos fijos (suma 100 %). STOCK: UNIDADES | DÍAS | A FECHA LLEGADA. COMPRA: FORMA | BULTO | CANT. PEDIR | CANT. SUGERIDA. */
const PCT_DESC = 36;
const PCT_STOCK_UNIDADES = 6;
const PCT_STOCK_DIAS = 6;
const PCT_STOCK_HASTA_LLEGADA = 8;
const PCT_FORMA = 9;
const PCT_BULTO = 6;
const PCT_CANT_PEDIR = 16;
const PCT_CANT_SUGERIDA = 7;
const PCT_ACCIONES = 3;
const PCT_INFO = 3;

const COL_COUNT = 10;

/** Suma de STOCK ACTUAL y PROM. VTA. de todas las sucursales de la fila. */
export function totalPorSucursalesPedidoAFabrica(
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

function productoPasaFiltrosDerivados(
  producto: ProductoPedidoAFabricaItem,
  sucursales: SucursalPedidoAFabrica[],
  tiempoEntregaEnDias: number | null,
  filtroProdVinculado: FiltroSiNoPedidoAFabrica,
  filtroStockQuebrado: FiltroSiNoPedidoAFabrica
): boolean {
  if (!filtroProdVinculado && !filtroStockQuebrado) return true;

  const vinculado = producto.codTienda != null;
  if (filtroProdVinculado === "si" && !vinculado) return false;
  if (filtroProdVinculado === "no" && vinculado) return false;

  if (!filtroStockQuebrado) return true;
  const total = totalPorSucursalesPedidoAFabrica(producto, sucursales);
  const stockHastaLlegada = calcularStockAFechaLlegadaPedidoAFabrica(
    total.stockActual,
    total.promVta,
    tiempoEntregaEnDias
  );
  const quebrado = esStockQuebradoPedidoAFabrica(stockHastaLlegada);
  if (filtroStockQuebrado === "si" && !quebrado) return false;
  if (filtroStockQuebrado === "no" && quebrado) return false;
  return true;
}

/**
 * Grilla Pedido A Fáb.
 * **DESCRIPCIÓN** (aviso stock quebrado) · **STOCK** (UNIDADES / DÍAS / A FECHA LLEGADA)
 * · **COMPRA** (FORMA / BULTO / CANT. PEDIR / CANT. SUGERIDA UNIDAD techo / BULTO múltiplo)
 * · tilde · Info.
 * (PROM. VTA. se calcula en backend/cliente pero no se muestra como columna.)
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
  filtroProdVinculado,
  filtroStockQuebrado,
  cantAPedirByCodExt,
  formaPedirByCodExt,
  onCantAPedirChange,
  onCantAPedirCommit,
  onFormaPedirChange,
  onAplicarCantSugerida,
}: Props) {
  const [detalleProducto, setDetalleProducto] =
    useState<ProductoPedidoAFabricaItem | null>(null);

  const productosFiltrados = useMemo(
    () =>
      productos.filter((p) =>
        productoPasaFiltrosDerivados(
          p,
          sucursales,
          tiempoEntregaEnDias,
          filtroProdVinculado,
          filtroStockQuebrado
        )
      ),
    [
      productos,
      sucursales,
      tiempoEntregaEnDias,
      filtroProdVinculado,
      filtroStockQuebrado,
    ]
  );

  const hayFiltrosDerivados =
    filtroProdVinculado !== "" || filtroStockQuebrado !== "";
  const mensajeVacio =
    productos.length > 0 &&
    productosFiltrados.length === 0 &&
    hayFiltrosDerivados
      ? "Ningún producto coincide con PROD. VINCULADO / STOCK QUEBRADO."
      : emptyMessage;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
        <Table variant="compact" scrollX={false}>
          <colgroup>
            <col style={{ width: `${PCT_DESC}%` }} />
            <col style={{ width: `${PCT_STOCK_UNIDADES}%` }} />
            <col style={{ width: `${PCT_STOCK_DIAS}%` }} />
            <col style={{ width: `${PCT_STOCK_HASTA_LLEGADA}%` }} />
            <col style={{ width: `${PCT_FORMA}%` }} />
            <col style={{ width: `${PCT_BULTO}%` }} />
            <col style={{ width: `${PCT_CANT_PEDIR}%` }} />
            <col style={{ width: `${PCT_CANT_SUGERIDA}%` }} />
            <col style={{ width: `${PCT_ACCIONES}%` }} />
            <col style={{ width: `${PCT_INFO}%` }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="min-w-0 align-middle">
                DESCRIPCIÓN
              </TableHead>
              <TableHead
                colSpan={3}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
              >
                STOCK
              </TableHead>
              <TableHead
                colSpan={4}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
              >
                COMPRA
              </TableHead>
              <TableHead
                rowSpan={2}
                className="text-center align-middle tabla-bloque-secundario-head-divider"
                aria-label="Vaciar cantidad a pedir"
              >
                <div className="flex w-full items-center justify-center">
                  <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
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
                UNIDADES
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head">
                DÍAS
              </TableHead>
              <TableHead className="text-center leading-tight tabla-bloque-secundario-head">
                A FECHA LLEGADA
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head-divider">
                FORMA
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head">
                BULTO
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head">
                CANT. PEDIR
              </TableHead>
              <TableHead className="text-center tabla-bloque-secundario-head">
                CANT. SUGERIDA
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
            ) : productosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COL_COUNT}
                  className="celda-datos text-center text-muted-foreground"
                >
                  {mensajeVacio}
                </TableCell>
              </TableRow>
            ) : (
              productosFiltrados.map((p) => {
                const total = totalPorSucursalesPedidoAFabrica(p, sucursales);
                const stockUnidades = total.stockActual;
                const promVtaTotal = total.promVta;
                const stockDias = calcularStockEnDiasPedidoAFabrica(
                  stockUnidades,
                  promVtaTotal
                );
                const stockHastaLlegada =
                  calcularStockAFechaLlegadaPedidoAFabrica(
                    stockUnidades,
                    promVtaTotal,
                    tiempoEntregaEnDias
                  );
                const stockQuebrado =
                  esStockQuebradoPedidoAFabrica(stockHastaLlegada);
                const formaPedir =
                  formaPedirByCodExt[p.codExt] ?? "UNIDADES_FIJAS";
                const cantSugerida = resolverCantSugeridaPedidoAFabrica(
                  {
                    stockActual: stockUnidades ?? 0,
                    promVtaTotal: promVtaTotal ?? 0,
                    tiempoEntregaEnDias,
                    tiempoStockeo,
                  },
                  formaPedir,
                  p.bulto
                );
                const cantAPedirRaw = cantAPedirByCodExt[p.codExt] ?? "";

                return (
                  <TableRow key={p.codExt}>
                    <TableCell className="celda-datos min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {stockQuebrado ? (
                          <span
                            className="inline-flex shrink-0"
                            title="Stock quebrado: stock hasta llegada de pedido ≤ 0"
                            aria-label="Stock quebrado"
                          >
                            <TriangleAlert
                              className={cn(
                                "size-4 shrink-0",
                                TEXT_WARNING_CLASS
                              )}
                              aria-hidden
                            />
                          </span>
                        ) : (
                          <span
                            className="inline-block size-4 shrink-0"
                            aria-hidden
                          />
                        )}
                        <span
                          className="block min-w-0 flex-1 truncate"
                          title={p.descripcion}
                        >
                          {p.descripcion}
                        </span>
                      </div>
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
                      className={cn(TD_NUM, "tabla-bloque-secundario-cell")}
                    >
                      {fmtNumero(stockHastaLlegada)}
                    </TableCell>
                    <TableCell className="celda-datos tabla-bloque-secundario-cell-divider">
                      <Select
                        value={formaPedir}
                        onValueChange={(v) => {
                          const parsed =
                            reposicionFormaPedidoFabricaSchema.safeParse(v);
                          if (parsed.success) {
                            onFormaPedirChange(p.codExt, parsed.data);
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            SELECT_TRIGGER_FILTER_CLASS,
                            "h-[calc(var(--tabla-body-row-min-height)-0.5rem)] min-h-0 w-full min-w-0 px-1 text-xs"
                          )}
                          aria-label={`Forma pedir ${p.descripcion}`}
                        >
                          <SelectValue placeholder="FORMA" />
                        </SelectTrigger>
                        <SelectContent
                          className="select-content-filtro"
                          position="popper"
                          side="bottom"
                          align="start"
                        >
                          {REPOSICION_FORMA_PEDIDO_FABRICA_VALUES.map((val) => (
                            <SelectItem key={val} value={val}>
                              {REPOSICION_FORMA_PEDIDO_FABRICA_LABELS[val]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className={cn(TD_NUM, "tabla-bloque-secundario-cell")}>
                      {p.codTienda ? fmtNumero(p.bulto) : ""}
                    </TableCell>
                    <TableCell className="celda-datos tabla-bloque-secundario-cell">
                      <EnteroStepperInput
                        value={cantAPedirRaw}
                        onChange={(v) => onCantAPedirChange(p.codExt, v)}
                        onCommit={(v) => onCantAPedirCommit(p.codExt, v)}
                        min={1}
                        allowEmpty
                        ariaLabel={`Cantidad a pedir ${p.descripcion}`}
                        endAction={
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
                        }
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        TD_NUM,
                        "tabla-bloque-secundario-cell"
                      )}
                    >
                      {cantSugerida != null ? fmtNumero(cantSugerida) : ""}
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila text-center tabla-bloque-secundario-cell-divider">
                      <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={cantAPedirRaw === ""}
                          onClick={() => onCantAPedirCommit(p.codExt, "")}
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label={`Vaciar cantidad a pedir: ${p.descripcion}`}
                        >
                          <Trash2
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
        formaPedir={
          detalleProducto
            ? (formaPedirByCodExt[detalleProducto.codExt] ??
              "UNIDADES_FIJAS")
            : "UNIDADES_FIJAS"
        }
      />
    </div>
  );
}
