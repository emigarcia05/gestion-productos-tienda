"use client";

import { toast } from "sonner";
import TablaListaPrecios, { type ProductoListaPrecios } from "./TablaListaPrecios";

interface Props {
  productos: ProductoListaPrecios[];
}

export default function TablaListaPreciosConPedido({ productos }: Props) {
  function handleAgregarAlPedido(producto: ProductoListaPrecios, cantidad: number) {
    toast.success(
      `Agregado al pedido: ${producto.descripcion.slice(0, 40)}${producto.descripcion.length > 40 ? "…" : ""} × ${cantidad}`
    );
  }

  return (
    <TablaListaPrecios
      productos={productos}
      onAgregarAlPedido={handleAgregarAlPedido}
    />
  );
}
