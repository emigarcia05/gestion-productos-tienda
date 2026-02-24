"use client";

import { useState } from "react";
import { fmtPrecio } from "@/lib/format";
import CantidadPedidoModal, {
  type ProductoParaPedido,
} from "@/components/pedidos/CantidadPedidoModal";

export interface ProductoListaPrecios {
  id: string;
  descripcion: string;
  codExt?: string;
  precioVentaSugerido: number;
  proveedor: { nombre: string; sufijo: string };
}

interface Props {
  productos: ProductoListaPrecios[];
  onAgregarAlPedido?: (producto: ProductoListaPrecios, cantidad: number) => void;
}

export default function TablaListaPrecios({ productos, onAgregarAlPedido }: Props) {
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
        <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
      </div>
    );
  }

  const puedeAgregar = !!onAgregarAlPedido;

  return (
    <>
    <div className="h-full overflow-auto rounded-lg border" style={{ borderColor: "rgba(0,114,187,0.25)" }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-brand">
          <tr>
            <th className="text-center py-2 px-3 text-brand-fg font-semibold text-xs w-28">
              Proveedor
            </th>
            <th className="text-center py-2 px-3 text-brand-fg font-semibold text-xs">
              Descripción
            </th>
            <th className="text-center py-2 px-3 text-brand-fg font-semibold text-xs w-32">
              Px Sugerido
            </th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => (
            <tr
              key={prod.id}
              className={`tabla-row transition-colors ${puedeAgregar ? "cursor-pointer hover:bg-white/5" : ""}`}
              onDoubleClick={() => handleDobleClick(prod)}
            >
              <td className="py-2 px-3 text-center text-xs text-white/60 font-mono">
                {prod.proveedor.sufijo}
              </td>
              <td className="py-2 px-3 text-center text-xs text-white font-semibold">
                {prod.descripcion}
              </td>
              <td className="py-2 px-3 text-center tabular-nums text-xs text-white font-bold">
                ${fmtPrecio(prod.precioVentaSugerido)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

      <CantidadPedidoModal
        open={modalAbierto}
        onOpenChange={setModalAbierto}
        producto={productoSeleccionado as ProductoParaPedido | null}
        onConfirmar={handleConfirmar}
      />
    </>
  );
}
