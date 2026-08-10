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
import { TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
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
 * **DESCRIPCIÓN** + por cada sucursal `pedido = true`: **STOCK ACTUAL** | **PROM. VTA.**
 * + grupo **TOTAL**: **CANT. SUGERIDA** | **CANT. A PEDIR** | tilde (copia sugerida → a pedir).
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
  const nSubSuc = nSuc * 2;
  const nSubTotal = nSuc > 0 ? 3 : 0;
  const nSub = nSubSuc + nSubTotal;
  const colCount = 1 + nSub;
  /** DESCRIPCIÓN ~36 %; resto entre subcolumnas de sucursal + TOTAL (3). */
  const pctDesc = nSub > 0 ? 36 : 100;
  const pctSub = nSub > 0 ? (100 - pctDesc) / nSub : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
        <Table variant="compact" scrollX={false}>
          <colgroup>
            <col style={{ width: `${pctDesc}%` }} />
            {sucursales.flatMap((s) => [
              <col key={`${s.id}-stock`} style={{ width: `${pctSub}%` }} />,
              <col key={`${s.id}-prom`} style={{ width: `${pctSub}%` }} />,
            ])}
            {nSuc > 0 ? (
              <>
                <col key="total-sugerida" style={{ width: `${pctSub}%` }} />
                <col key="total-a-pedir" style={{ width: `${pctSub}%` }} />
                <col key="total-tilde" style={{ width: `${pctSub}%` }} />
              </>
            ) : null}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="min-w-0 align-middle">
                DESCRIPCIÓN
              </TableHead>
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
              {nSuc > 0 ? (
                <TableHead
                  colSpan={3}
                  className="text-center align-middle tabla-bloque-secundario-head-divider"
                >
                  TOTAL
                </TableHead>
              ) : null}
            </TableRow>
            <TableRow className="hover:bg-transparent">
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
                const tildeActivo =
                  cantSugerida != null &&
                  cantAPedirRaw !== "" &&
                  Number(cantAPedirRaw) === cantSugerida;

                return (
                  <TableRow key={p.codExt}>
                    <TableCell className="celda-datos min-w-0">
                      <span className="block truncate" title={p.descripcion}>
                        {p.descripcion}
                      </span>
                    </TableCell>
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
                        <TableCell
                          className={cn(
                            "celda-datos celda-datos--accion-relleno-fila text-center tabla-bloque-secundario-cell"
                          )}
                        >
                          <div className="flex h-full w-full items-center justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={cantSugerida == null}
                              onClick={() => {
                                if (cantSugerida == null) return;
                                onAplicarCantSugerida(p.codExt, cantSugerida);
                              }}
                              className={cn(
                                "tabla-check-toggle tabla-check-toggle--alto-fila shrink-0 !bg-background",
                                tildeActivo && "[&_svg]:!text-[#0072bb]"
                              )}
                              aria-pressed={tildeActivo}
                              aria-label={`Aplicar cantidad sugerida a pedir: ${p.descripcion}`}
                            >
                              {tildeActivo ? (
                                <Check
                                  className={TABLE_ROW_ACTION_ICON_CLASS}
                                  aria-hidden
                                />
                              ) : null}
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : null}
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
