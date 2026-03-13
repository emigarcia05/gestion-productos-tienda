"use client";

import { toast } from "sonner";
import TablaPedidoUrgente, { type ProductoListaPrecios } from "./TablaPedidoUrgente";
import type { FiltroPedidoValor } from "./FiltrosPedidoUrgente";

interface Props {
  productos: ProductoListaPrecios[];
  sinFiltros?: boolean;
  mensajeSinSucursal?: string;
  pedidoFilter?: FiltroPedidoValor;
}

export default function PedidoUrgenteTablaConToast({
  productos,
  sinFiltros = false,
  mensajeSinSucursal = "Seleccioná una sucursal para ver los productos.",
  pedidoFilter = "",
}: Props) {
  function handleAgregarAlPedido(producto: ProductoListaPrecios, cantidad: number) {
    toast.success(
      `Agregado al pedido: ${producto.descripcion.slice(0, 40)}${producto.descripcion.length > 40 ? "…" : ""} × ${cantidad}`
    );
  }

  return (
    <TablaPedidoUrgente
      productos={productos}
      onAgregarAlPedido={handleAgregarAlPedido}
      sinFiltros={sinFiltros}
      mensajeSinSucursal={mensajeSinSucursal}
      pedidoFilter={pedidoFilter}
    />
  );
}
