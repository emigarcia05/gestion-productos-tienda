"use client";

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
  /** `px_compra_final_sin_iva` desde prod_precios_provee (null si no está disponible). */
  pxCompraFinalSinIva: number | null;
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
  /** Mismo vínculo tienda (`cod_tienda`): varios proveedores en una fila; cantidades por `codExt` de cada miembro. */
  miembrosAgrupacion?: Array<{
    codExt: string;
    prefijo: string;
    pxCompraFinalSinIva: number | null;
    cantPedidaUrgente: number;
    estaVinculadoTienda: boolean;
    sugerenciaProveedorMenorCosto: {
      listaPrecioProveedorId: string;
      proveedorNombre: string;
      costo: number;
    } | null;
  }>;
}

export type PedidoFilterValor = "urgente" | "reposicion" | "";

const COLUMNS = 7;
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";
const COL_WIDTHS_PCT = [11, 7, 44, 10, 10, 9, 9] as const;
const CELL_MIN = "min-w-0";

function cantPedidaUrgenteMostrada(prod: ProductoPedidoUrgente, cantPorId: Record<string, string>): string {
  if (prod.miembrosAgrupacion && prod.miembrosAgrupacion.length > 0) {
    const sum = prod.miembrosAgrupacion.reduce(
      (s, m) => s + Math.max(0, Math.floor(Number(cantPorId[m.codExt] || 0) || 0)),
      0
    );
    return sum > 0 ? String(sum) : "";
  }
  const v = cantPorId[prod.id];
  return v && Number(v) > 0 ? v : "";
}

function hayCantidadPedidaUrgente(prod: ProductoPedidoUrgente, cantPorId: Record<string, string>): boolean {
  if (prod.miembrosAgrupacion && prod.miembrosAgrupacion.length > 0) {
    return prod.miembrosAgrupacion.some((m) => Number(cantPorId[m.codExt] || 0) > 0);
  }
  return Number(cantPorId[prod.id] || 0) > 0;
}

interface Props {
  productos: ProductoPedidoUrgente[];
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  /** Cantidades mostradas (controlado desde PedidoUrgentePageClient). */
  cantPorId: Record<string, string>;
  /** Callback al hacer doble click en una fila para abrir el modal de edición de cantidad. */
  onRowDoubleClick?: (producto: ProductoPedidoUrgente) => void;
  onRowDeleteClick?: (producto: ProductoPedidoUrgente) => void;
}

export default function TablaPedidoUrgente({
  productos,
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  cantPorId,
  onRowDoubleClick,
  onRowDeleteClick,
}: Props) {

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
          <TableHead className={cn(CELL_MIN, "text-center")}>VINC.</TableHead>
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
              title={
                prod.miembrosAgrupacion && prod.miembrosAgrupacion.length > 1
                  ? prod.miembrosAgrupacion.map((m) => m.prefijo).filter(Boolean).join(" · ")
                  : undefined
              }
              onDoubleClick={() => onRowDoubleClick?.(prod)}
            >
              <TableCell className="celda-datos">{prod.prefijo}</TableCell>
              <TableCell className="celda-datos text-center">
                {prod.estaVinculadoTienda ? (
                  <Check
                    className="h-4 w-4 mx-auto text-primary"
                    aria-label="Vinculado a tienda"
                  />
                ) : (
                  ""
                )}
              </TableCell>
              <TableCell className="celda-datos min-w-0 truncate" title={prod.descripcion}>
                {prod.descripcion}
              </TableCell>
              <TableCell className="celda-datos text-center tabular-nums">
                {cantPedidaUrgenteMostrada(prod, cantPorId)}
              </TableCell>
              <TableCell
                className={cn(
                  "celda-datos text-center celda-datos--accion-relleno-fila",
                  CELL_MIN
                )}
              >
                {hayCantidadPedidaUrgente(prod, cantPorId) ? (
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
