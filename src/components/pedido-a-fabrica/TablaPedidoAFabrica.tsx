"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionClient from "@/components/shared/PaginacionClient";
import type { ProductoPedidoAFabricaItem } from "@/services/pedidoAFabrica.service";

interface Props {
  productos: ProductoPedidoAFabricaItem[];
  pagina: number;
  totalPaginas: number;
  onPaginaChange: (pagina: number) => void;
  loading?: boolean;
  emptyMessage: string;
}

/**
 * Grilla Pedido A Fábrica. Primera columna: **DESCRIPCIÓN** (`descripcion_proveedor`).
 */
export default function TablaPedidoAFabrica({
  productos,
  pagina,
  totalPaginas,
  onPaginaChange,
  loading = false,
  emptyMessage,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
        <Table variant="compact" scrollX={false}>
          <colgroup>
            <col className="w-full" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-0">DESCRIPCIÓN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="celda-datos text-center text-muted-foreground">
                  Cargando productos…
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell className="celda-datos text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.codExt}>
                  <TableCell className="celda-datos min-w-0">
                    <span className="block truncate" title={p.descripcion}>
                      {p.descripcion}
                    </span>
                  </TableCell>
                </TableRow>
              ))
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
