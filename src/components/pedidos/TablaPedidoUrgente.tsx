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
import { Check, SquareCheckBig, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProductoPedidoUrgente {
  id: string;
  /** Código externo lista-precios proveedor. */
  codExt: string;
  prefijo: string;
  descripcion: string;
  /** px_compra_final desde precios_proveedores (null si no está disponible). */
  pxCompraFinal: number | null;
  /** Cantidad pedida (URGENTE) desde pedidos_mercaderia. */
  cantPedidaUrgente: number;
  /** true si existe el cod_ext en pedidos_mercaderia con tipo_de_pedido = REPOSICION. */
  confReposicion: boolean;
  /** cant_pedir_reposicion desde pedidos_mercaderia (0 si no hay). */
  cantReposicion: number;
}

export type PedidoFilterValor = "urgente" | "reposicion" | "";

const COLUMNS = 8;
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

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
    <div className="contenedor-tabla-gestion no-scroll-x">
      <Table variant="compact" scrollX={false} className="min-w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-center w-[5%]" aria-label="Seleccionar">
              <div className="flex items-center justify-center w-full">
                <Check className="h-4 w-4" aria-hidden="true" />
              </div>
            </TableHead>
            <TableHead className="text-center w-[5%]">
              OPC. COMPRA
            </TableHead>
            <TableHead className="text-center w-[10%]">
              PROVEEDOR
            </TableHead>
            <TableHead className="w-[50%]">DESCRIPCIÓN</TableHead>
            <TableHead className="text-center w-[8%]">
              CANT. PED.
            </TableHead>
            <TableHead className="text-center w-[6%]" aria-label="Eliminar">
              <div className="flex items-center justify-center w-full">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </div>
            </TableHead>
            <TableHead
              className="text-center w-[8%] tabla-bloque-secundario-head-divider"
            >
              CONF. REPO.
            </TableHead>
            <TableHead
              className="text-center w-[8%] tabla-bloque-secundario-head"
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
                      className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-primary bg-background text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      aria-label="Seleccionar para opción de compra"
                      aria-pressed={!!selectedForCompra[prod.id]}
                    >
                      {selectedForCompra[prod.id] ? (
                        <SquareCheckBig className="h-3.5 w-3.5" aria-hidden="true" />
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
                        variant="ghost"
                        size="icon-xs"
                        className="text-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowDeleteClick?.(prod);
                        }}
                        aria-label="Eliminar cantidad pedida"
                      >
                        <Trash2 />
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
    </div>
  );
}
