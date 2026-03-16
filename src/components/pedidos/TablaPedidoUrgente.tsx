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
import { Check } from "lucide-react";

export interface ProductoPedidoUrgente {
  id: string;
  /** Código externo lista-precios proveedor. */
  codExt: string;
  prefijo: string;
  regDux: boolean;
  descripcion: string;
  /** true si existe una regla de pedidos_reposicion para este proveedor/sucursal/cod_ext. */
  confReposicion: boolean;
  /** cant_pedir desde pedidos_reposicion (0 si no hay regla o no aplica). */
  cantReposicion: number;
}

export type PedidoFilterValor = "si" | "no" | "";

const COLUMNS = 7;
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

interface Props {
  productos: ProductoPedidoUrgente[];
  sucursal?: "" | "guaymallen" | "maipu";
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  pedidoFilter?: PedidoFilterValor;
  /** Estado de cantidades controlado desde el padre (PedidoUrgentePageClient). */
  cantPorId?: Record<string, string>;
  setCantPorId?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Callback al hacer doble click en una fila para abrir el modal de edición de cantidad. */
  onRowDoubleClick?: (producto: ProductoPedidoUrgente) => void;
}

export default function TablaPedidoUrgente({
  productos,
  sucursal = "",
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  pedidoFilter = "",
  cantPorId: cantPorIdProp,
  setCantPorId: setCantPorIdProp,
  onRowDoubleClick,
}: Props) {
  const [cantPorIdInternal, setCantPorIdInternal] = useState<Record<string, string>>({});
  const cantPorId = cantPorIdProp ?? cantPorIdInternal;
  const setCantPorId = setCantPorIdProp ?? setCantPorIdInternal;

  const visibleProductos =
    pedidoFilter === "si"
      ? productos.filter((p) => Number(cantPorId[p.id] || 0) > 0)
      : pedidoFilter === "no"
        ? productos.filter((p) => Number(cantPorId[p.id] || 0) === 0)
        : productos;

  const mensajeVacio = sinFiltros ? mensajeSinSucursal : MENSAJE_SIN_RESULTADOS;

  return (
    <div className="w-full min-w-full">
      <Table variant="compact" scrollX={false} className="min-w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-center" style={{ width: "10%" }}>
              PROVEEDOR
            </TableHead>
            <TableHead className="text-center" style={{ width: "10%" }}>
              REG. DUX
            </TableHead>
            <TableHead style={{ width: "60%" }}>DESCRIPCIÓN</TableHead>
            <TableHead className="text-center" style={{ width: "10%" }}>
              CANT. PEDIDA
            </TableHead>
            <TableHead
              className="text-center tabla-bloque-secundario-head-divider"
              style={{ width: "5%" }}
            >
              CONF. REPOSICIÓN
            </TableHead>
            <TableHead
              className="text-center tabla-bloque-secundario-head"
              style={{ width: "5%" }}
            >
              CANT. REPOSICIÓN
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
                <TableCell className="celda-datos celda-mono font-mono text-sm">
                  {prod.prefijo}
                </TableCell>
                <TableCell className="celda-datos text-center">
                  {prod.regDux ? (
                    <Check
                      className="h-4 w-4 text-primary mx-auto"
                      aria-label="Registrado en Dux"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="celda-datos min-w-0 truncate" title={prod.descripcion}>
                  {prod.descripcion}
                </TableCell>
                <TableCell className="celda-datos text-center tabular-nums">
                  {cantPorId[prod.id] && Number(cantPorId[prod.id]) > 0
                    ? cantPorId[prod.id]
                    : "—"}
                </TableCell>
                <TableCell className="celda-datos text-center tabla-bloque-secundario-cell-divider">
                  {prod.confReposicion ? (
                    <Check
                      className="h-4 w-4 mx-auto text-primary"
                      aria-label="Configurado en reposición"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="celda-datos text-center tabla-bloque-secundario-cell tabular-nums">
                  {prod.confReposicion ? prod.cantReposicion : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
