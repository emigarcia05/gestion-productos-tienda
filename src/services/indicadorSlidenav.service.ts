import { PERMISOS, puede } from "@/lib/permisos";
import type { Rol } from "@/lib/permisos";
import type { SucursalPreferida } from "@/lib/sucursalPreferida";
import type { IndicadorSlidenavDto } from "@/lib/indicadorSlidenav";

const PEDIDOS_VACIO = {
  urgente: 0,
  tintometrico: 0,
  reposicion: 0,
  proveedores: [] as IndicadorSlidenavDto["proveedoresPedido"],
};

/**
 * Indicador de Pendientes: pedidos (Generar Pedido) y/o COUNT de transf. como origen.
 * `parte=transf` omite el armado de Generar Pedido (lento).
 */
export async function obtenerIndicadorSlidenav(input: {
  rol: Rol;
  sucursal: SucursalPreferida;
  incluirPedidos: boolean;
}): Promise<IndicadorSlidenavDto> {
  const pedidosPromise =
    input.incluirPedidos && puede(input.rol, PERMISOS.pedidos.acceso)
      ? import("@/services/pedidosEnvio.service").then((m) =>
          m.contarItemsPedidoPorTipoParaSlidenav(input.sucursal)
        )
      : Promise.resolve(PEDIDOS_VACIO);
  const transfPromise = puede(input.rol, PERMISOS.stock.acceso)
    ? import("@/services/transfDepositos.service").then((m) =>
        m.hayPendientesTransfDepositosComoOrigen(input.sucursal)
      )
    : Promise.resolve(false);
  const [pedidos, hayTransfOrigen] = await Promise.all([
    pedidosPromise,
    transfPromise,
  ]);
  return {
    urgente: pedidos.urgente,
    tintometrico: pedidos.tintometrico,
    reposicion: pedidos.reposicion,
    proveedoresPedido: pedidos.proveedores,
    hayTransfOrigen,
  };
}
