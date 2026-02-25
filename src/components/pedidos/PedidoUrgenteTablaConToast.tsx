"use client";

import { toast } from "sonner";
import TablaPedidoUrgente, { type ProductoListaPrecios } from "./TablaPedidoUrgente";

interface Props {
  productos: ProductoListaPrecios[];
}

export default function PedidoUrgenteTablaConToast({ productos }: Props) {
  function handleAgregarAlPedido(producto: ProductoListaPrecios, cantidad: number) {
    toast.success(
      `Agregado al pedido: ${producto.descripcion.slice(0, 40)}${producto.descripcion.length > 40 ? "…" : ""} × ${cantidad}`
    );
  }

  return (
    <TablaPedidoUrgente
      productos={productos}
      onAgregarAlPedido={handleAgregarAlPedido}
    />
  );
}
