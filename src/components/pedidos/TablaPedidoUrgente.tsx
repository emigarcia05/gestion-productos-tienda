"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_CLASS,
  TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS,
} from "@/lib/ui-classes";

export interface ProductoPedidoUrgente {
  id: string;
  /** Código externo lista-precios proveedor. */
  codExt: string;
  prefijo: string;
  descripcion: string;
  /** px_compra_final desde prod_precios_provee (null si no está disponible). */
  pxCompraFinal: number | null;
  /** Cantidad pedida (URGENTE) desde prod_ped_merc. */
  cantPedidaUrgente: number;
  /** true si existe el cod_ext en prod_ped_merc con tipo_de_pedido = REPOSICION. */
  confReposicion: boolean;
  /** cant_pedir_reposicion desde prod_ped_merc (0 si no hay). */
  cantReposicion: number;
}

export type PedidoFilterValor = "urgente" | "reposicion" | "";

const COLUMNS = 8;
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";
const COL_WIDTHS_PCT = [5, 7, 10, 50, 7, 7, 7, 7] as const;
const CELL_MIN = "min-w-0";

interface Props {
  productos: ProductoPedidoUrgente[];
  sucursal?: "" | "guaymallen" | "maipu";
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  /** Estado de cantidades controlado desde el padre (PedidoUrgentePageClient). */
  cantPorId?: Record<string, string>;
  setCantPorId?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedForCompra?: Record<string, boolean>;
  ordenCompraPorId?: Record<string, number>;
  onToggleSelectCompra?: (producto: ProductoPedidoUrgente) => void;
  /** Callback al hacer doble click en una fila para abrir el modal de edición de cantidad. */
  onRowDoubleClick?: (producto: ProductoPedidoUrgente) => void;
  onRowDeleteClick?: (producto: ProductoPedidoUrgente) => void;
}

export default function TablaPedidoUrgente({
  productos,
  sucursal = "",
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  cantPorId: cantPorIdProp,
  setCantPorId: setCantPorIdProp,
  selectedForCompra = {},
  ordenCompraPorId = {},
  onToggleSelectCompra,
  onRowDoubleClick,
  onRowDeleteClick,
}: Props) {
  const [cantPorIdInternal, setCantPorIdInternal] = useState<Record<string, string>>({});
  const cantPorId = cantPorIdProp ?? cantPorIdInternal;
  const setCantPorId = setCantPorIdProp ?? setCantPorIdInternal;

  const visibleProductos = productos;

  const mensajeVacio = sinFiltros ? mensajeSinSucursal : MENSAJE_SIN_RESULTADOS;

  return (
      <Table
        variant="compact"
        scrollX={false}
        className="tabla-gestion-compacta w-full table-fixed"
      >
        <colgroup>
          {COL_WIDTHS_PCT.map((pct, i) => (
            <col key={i} style={{ width: `${pct}%` }} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(CELL_MIN, "text-center")} aria-label="Seleccionar">
              <div className="flex items-center justify-center w-full">
                <Check className="h-4 w-4" aria-hidden="true" />
              </div>
            </TableHead>
            <TableHead className={cn(CELL_MIN, "text-center")}>
              PRIORIDAD
            </TableHead>
            <TableHead className={cn(CELL_MIN, "text-center")}>
              PROVEEDOR
            </TableHead>
            <TableHead className={CELL_MIN}>DESCRIPCIÓN</TableHead>
            <TableHead className={cn(CELL_MIN, "text-center")}>
              CANT. PED.
            </TableHead>
            <TableHead className={cn(CELL_MIN, "text-center")} aria-label="Eliminar">
              <div className="flex items-center justify-center w-full">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </div>
            </TableHead>
            <TableHead
              className={cn(
                CELL_MIN,
                "text-center tabla-bloque-secundario-head-divider"
              )}
            >
              CONF. REPO.
            </TableHead>
            <TableHead
              className={cn(CELL_MIN, "text-center tabla-bloque-secundario-head")}
            >
              CANT. REPO.
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleProductos.length === 0 ? (
            <EmptyTableRow colSpan={COLUMNS} message={mensajeVacio} />
          ) : (
            visibleProductos.map((prod) => (
              <TableRow
                key={prod.id}
                className="cursor-pointer"
                onDoubleClick={() => onRowDoubleClick?.(prod)}
              >
                <TableCell className="celda-datos text-center">
                  <div className="flex items-center justify-center w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectCompra?.(prod);
                      }}
                      className="tabla-check-toggle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      aria-label="Seleccionar para opción de compra"
                      aria-pressed={!!selectedForCompra[prod.id]}
                    >
                      {selectedForCompra[prod.id] ? (
                        <Check aria-hidden="true" />
                      ) : null}
                    </button>
                  </div>
                </TableCell>
                <TableCell className="celda-datos text-center tabular-nums font-semibold">
                  {ordenCompraPorId[prod.id] ?? ""}
                </TableCell>
                <TableCell className="celda-datos celda-mono font-mono text-sm">
                  {prod.prefijo}
                </TableCell>
                <TableCell className="celda-datos min-w-0 truncate" title={prod.descripcion}>
                  {prod.descripcion}
                </TableCell>
                <TableCell className="celda-datos text-center tabular-nums">
                  {cantPorId[prod.id] && Number(cantPorId[prod.id]) > 0
                    ? cantPorId[prod.id]
                    : ""}
                </TableCell>
                <TableCell className="celda-datos text-center">
                  {Number(cantPorId[prod.id] || 0) > 0 ? (
                    <div className="flex items-center justify-center w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        className={cn(
                          TABLE_ROW_ICON_BUTTON_CLASS,
                          TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowDeleteClick?.(prod);
                        }}
                        aria-label="Eliminar cantidad pedida"
                      >
                        <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} />
                      </Button>
                    </div>
                  ) : (
                    ""
                  )}
                </TableCell>
                <TableCell className="celda-datos text-center tabla-bloque-secundario-cell-divider">
                  {prod.confReposicion ? (
                    <Check
                      className="h-4 w-4 mx-auto text-primary"
                      aria-label="Configurado en reposición"
                    />
                  ) : (
                    ""
                  )}
                </TableCell>
                <TableCell className="celda-datos text-center tabla-bloque-secundario-cell tabular-nums">
                  {prod.confReposicion ? prod.cantReposicion : ""}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
  );
}
