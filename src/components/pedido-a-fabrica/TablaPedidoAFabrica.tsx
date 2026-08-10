"use client";

import { Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { fmtNumero } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { calcularCantSugeridaPedidoAFabrica } from "@/lib/pedidoAFabricaPromVta";
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

/** Anchos fijos (suma 100 % con 2 sucursales `pedido`). */
const PCT_DESC = 35;
const PCT_CANT_SUGERIDA = 8;
const PCT_CANT_A_PEDIR = 8;
const PCT_BOTON = 4;
const PCT_STOCK_SUCURSAL = 10;
const PCT_PROM_SUCURSAL = 10;

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
 * Orden: **DESCRIPCIÓN** (35 %) · **TOTAL** (25 % = 8+8+4) · sucursales (20 % c/u = 10+10).
 * Botón brand con **Check** copia **CANT. SUGERIDA** → **CANT. A PEDIR**.
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
  const nSuc = sucursales.length;
  const colCount = nSuc > 0 ? 1 + 3 + nSuc * 2 : 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
        <Table variant="compact" scrollX={false}>
          <colgroup>
            <col style={{ width: `${nSuc > 0 ? PCT_DESC : 100}%` }} />
            {nSuc > 0 ? (
              <>
                <col style={{ width: `${PCT_CANT_SUGERIDA}%` }} />
                <col style={{ width: `${PCT_CANT_A_PEDIR}%` }} />
                <col style={{ width: `${PCT_BOTON}%` }} />
              </>
            ) : null}
            {sucursales.flatMap((s) => [
              <col
                key={`${s.id}-stock`}
                style={{ width: `${PCT_STOCK_SUCURSAL}%` }}
              />,
              <col
                key={`${s.id}-prom`}
                style={{ width: `${PCT_PROM_SUCURSAL}%` }}
              />,
            ])}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="min-w-0 align-middle">
                DESCRIPCIÓN
              </TableHead>
              {nSuc > 0 ? (
                <TableHead
                  colSpan={3}
                  className="text-center align-middle tabla-bloque-secundario-head-divider"
                >
                  TOTAL
                </TableHead>
              ) : null}
              {sucursales.map((s, i) => (
                <TableHead
                  key={s.id}
                  colSpan={2}
                  className={cn(
                    "text-center align-middle",
                    i === 0
                      ? "tabla-bloque-secundario-head-divider"
                      : "tabla-bloque-secundario-head"
                  )}
                >
                  {s.nombre.toLocaleUpperCase("es")}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="hover:bg-transparent">
              {nSuc > 0 ? (
                <>
                  <TableHead className="text-center tabla-bloque-secundario-head-divider">
                    CANT. SUGERIDA
                  </TableHead>
                  <TableHead className="text-center tabla-bloque-secundario-head">
                    CANT. A PEDIR
                  </TableHead>
                  <TableHead
                    className="text-center tabla-bloque-secundario-head"
                    aria-label="Aplicar cantidad sugerida"
                  >
                    <div className="flex w-full items-center justify-center">
                      <Check
                        className={TABLE_ROW_ACTION_ICON_CLASS}
                        aria-hidden
                      />
                    </div>
                  </TableHead>
                </>
              ) : null}
              {sucursales.flatMap((s, i) => [
                <TableHead
                  key={`${s.id}-stock-h`}
                  className={cn(
                    "text-center",
                    i === 0
                      ? "tabla-bloque-secundario-head-divider"
                      : "tabla-bloque-secundario-head"
                  )}
                >
                  STOCK ACTUAL
                </TableHead>,
                <TableHead
                  key={`${s.id}-prom-h`}
                  className="text-center tabla-bloque-secundario-head"
                >
                  PROM. VTA.
                </TableHead>,
              ])}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="celda-datos text-center text-muted-foreground"
                >
                  Cargando productos…
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="celda-datos text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => {
                const total = totalPorSucursales(p, sucursales);
                const stockActual = total.stockActual ?? 0;
                const promVtaTotal = total.promVta ?? 0;
                const calc = calcularCantSugeridaPedidoAFabrica({
                  stockActual,
                  promVtaTotal,
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
                    {nSuc > 0 ? (
                      <>
                        <TableCell
                          className={cn(
                            TD_NUM,
                            "tabla-bloque-secundario-cell-divider"
                          )}
                        >
                          {cantSugerida != null
                            ? fmtNumero(cantSugerida)
                            : ""}
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
                        <TableCell className="celda-datos celda-datos--accion-relleno-fila text-center tabla-bloque-secundario-cell">
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
                              aria-label={`Aplicar cantidad sugerida a pedir: ${p.descripcion}`}
                            >
                              <Check
                                className={TABLE_ROW_ACTION_ICON_CLASS}
                                aria-hidden
                              />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : null}
                    {sucursales.flatMap((s, i) => {
                      const datos = p.porSucursal[s.id];
                      return [
                        <TableCell
                          key={`${p.codExt}-${s.id}-stock`}
                          className={cn(
                            TD_NUM,
                            i === 0
                              ? "tabla-bloque-secundario-cell-divider"
                              : "tabla-bloque-secundario-cell"
                          )}
                        >
                          {fmtNumero(datos?.stockActual)}
                        </TableCell>,
                        <TableCell
                          key={`${p.codExt}-${s.id}-prom`}
                          className={cn(TD_NUM, "tabla-bloque-secundario-cell")}
                        >
                          {fmtNumero(datos?.promVta)}
                        </TableCell>,
                      ];
                    })}
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
    </div>
  );
}
