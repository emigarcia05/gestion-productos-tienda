"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

  if (productos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center max-w-md px-4">
          {sinFiltros ? MENSAJE_SIN_FILTRO : MENSAJE_SIN_RESULTADOS}
        </p>
      </div>
    );
  }

  const puedeAgregar = !!onAgregarAlPedido;

  return (
    <>
    <div className="h-full overflow-auto rounded-lg border bg-white" style={{ borderColor: "rgba(0,114,187,0.25)" }}>
      <Table variant="compact">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="py-2 px-3 text-xs w-28">Proveedor</TableHead>
            <TableHead className="py-2 px-3 text-xs">Descripción</TableHead>
            <TableHead className="py-2 px-3 text-xs w-32 text-primary">Cantidad Urgente</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((prod) => (
            <TableRow
              key={prod.id}
              className={puedeAgregar ? "cursor-pointer" : ""}
              onDoubleClick={() => handleDobleClick(prod)}
            >
              <TableCell className="py-2 px-3 text-xs font-mono">{prod.proveedor.prefijo}</TableCell>
              <TableCell className="py-2 px-3 text-xs font-semibold">{prod.descripcion}</TableCell>
              <TableCell className="py-2 px-3 text-center tabular-nums text-xs">—</TableCell>
            </TableRow>
          ))}
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
