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
    <div className="h-full min-h-0 overflow-auto rounded-lg border border-card-border bg-card">
      <Table variant="compact">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28">PROVEEDOR</TableHead>
            <TableHead>DESCRIPCIÓN</TableHead>
            <TableHead className="w-32">CANT. URG.</TableHead>
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
              <TableCell className="celda-datos celda-mono">{prod.proveedor.prefijo}</TableCell>
              <TableCell className="celda-datos font-semibold">{prod.descripcion}</TableCell>
              <TableCell className="celda-datos tabular-nums" />
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
