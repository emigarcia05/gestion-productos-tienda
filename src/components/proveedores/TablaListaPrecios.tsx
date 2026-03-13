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
import CantidadPedidoModal from "@/components/pedidos/CantidadPedidoModal";

export interface ProductoListaPrecios {
  id: string;
  descripcion: string;
  codigoExterno?: string;
  precioVentaSugerido: number;
  proveedor: { nombre: string; prefijo: string };
}

const MENSAJE_SIN_FILTRO = "Aplicá al menos un filtro (Proveedor o búsqueda) para ver los productos.";
const MENSAJE_SIN_RESULTADOS = "No se encontraron productos.";

interface Props {
  productos: ProductoListaPrecios[];
  onAgregarAlPedido?: (producto: ProductoListaPrecios, cantidad: number) => void;
  sinFiltros?: boolean;
}

export default function TablaListaPrecios({ productos, onAgregarAlPedido, sinFiltros = false }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoListaPrecios | null>(null);

  function handleDobleClick(prod: ProductoListaPrecios) {
    if (!onAgregarAlPedido) return;
    setProductoSeleccionado(prod);
    setModalAbierto(true);
  }

  function handleConfirmar(cantidad: number) {
    if (productoSeleccionado && onAgregarAlPedido) {
      onAgregarAlPedido(productoSeleccionado, cantidad);
    }
    setProductoSeleccionado(null);
  }

  const puedeAgregar = !!onAgregarAlPedido;

  return (
    <>
    <div className="h-full overflow-auto rounded-lg border border-card-border bg-card">
      <Table variant="compact">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-2 px-3 text-xs w-28">PROVEEDOR</TableHead>
            <TableHead className="py-2 px-3 text-xs">DESCRIPCIÓN</TableHead>
            <TableHead className="py-2 px-3 text-xs w-32 text-primary">CANTIDAD URGENTE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.length === 0 ? (
            <EmptyTableRow
              colSpan={3}
              message={sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS}
            />
          ) : (
          productos.map((prod) => (
            <TableRow
              key={prod.id}
              className={puedeAgregar ? "cursor-pointer" : ""}
              onDoubleClick={() => handleDobleClick(prod)}
            >
              <TableCell className="py-2 px-3 text-xs font-mono">{prod.proveedor.prefijo}</TableCell>
              <TableCell className="py-2 px-3 text-xs font-semibold">{prod.descripcion}</TableCell>
              <TableCell className="py-2 px-3 text-center tabular-nums text-xs">—</TableCell>
            </TableRow>
          ))
          )}
        </TableBody>
      </Table>
    </div>

      <CantidadPedidoModal
        open={modalAbierto}
        onOpenChange={setModalAbierto}
        producto={productoSeleccionado}
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
