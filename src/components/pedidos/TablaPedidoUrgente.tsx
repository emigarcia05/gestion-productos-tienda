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
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

export interface ProductoPedidoUrgente {
  id: string;
  /** Código externo lista-precios proveedor. */
  codExt: string;
  prefijo: string;
  descripcion: string;
  /** px_compra_final desde prod_precios_provee (null si no está disponible). */
  pxCompraFinal: number | null;
  /** Cantidad pedida (URGENTE) desde `prod_ped_merc.urgente_cant_pedir`. */
  cantPedidaUrgente: number;
  /** true si hay regla REPOSICIÓN en `prod_ped_merc` para el `cod_tienda` del ítem. */
  confReposicion: boolean;
  /** `reposicion_cant_conf` en `prod_ped_merc` (0 si no hay). */
  cantReposicion: number;
  estaVinculadoTienda: boolean;
  sugerenciaProveedorMenorCosto: {
    listaPrecioProveedorId: string;
    proveedorNombre: string;
    costo: number;
  } | null;
}

export type PedidoFilterValor = "urgente" | "reposicion" | "";

const COLUMNS = 6;
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";
const COL_WIDTHS_PCT = [12, 52, 10, 10, 8, 8] as const;
const CELL_MIN = "min-w-0";

interface Props {
  productos: ProductoPedidoUrgente[];
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  /** Estado de cantidades controlado desde el padre (PedidoUrgentePageClient). */
  cantPorId?: Record<string, string>;
  setCantPorId?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Callback al hacer doble click en una fila para abrir el modal de edición de cantidad. */
  onRowDoubleClick?: (producto: ProductoPedidoUrgente) => void;
  onRowDeleteClick?: (producto: ProductoPedidoUrgente) => void;
}

export default function TablaPedidoUrgente({
  productos,
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  cantPorId: cantPorIdProp,
  setCantPorId: setCantPorIdProp,
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
          <TableHead className={cn(CELL_MIN, "text-center")}>PROVEEDOR</TableHead>
          <TableHead className={CELL_MIN}>DESCRIPCIÓN</TableHead>
          <TableHead className={cn(CELL_MIN, "text-center")}>CANT. PED.</TableHead>
          <TableHead className={cn(CELL_MIN, "text-center")} aria-label="Eliminar">
            <div className="flex items-center justify-center w-full">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </div>
          </TableHead>
          <TableHead
            className={cn(CELL_MIN, "text-center tabla-bloque-secundario-head-divider")}
          >
            CONF. REPO.
          </TableHead>
          <TableHead className={cn(CELL_MIN, "text-center tabla-bloque-secundario-head")}>
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
              <TableCell className="celda-datos">{prod.prefijo}</TableCell>
              <TableCell className="celda-datos min-w-0 truncate" title={prod.descripcion}>
                {prod.descripcion}
              </TableCell>
              <TableCell className="celda-datos text-center tabular-nums">
                {cantPorId[prod.id] && Number(cantPorId[prod.id]) > 0
                  ? cantPorId[prod.id]
                  : ""}
              </TableCell>
              <TableCell
                className={cn(
                  "celda-datos text-center celda-datos--accion-relleno-fila",
                  CELL_MIN
                )}
              >
                {Number(cantPorId[prod.id] || 0) > 0 ? (
                  <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowDeleteClick?.(prod);
                      }}
                      aria-label="Eliminar cantidad pedida"
                    >
                      <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
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
