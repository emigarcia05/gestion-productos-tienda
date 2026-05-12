import { revalidatePath } from "next/cache";

/**
 * Invalida la página Pedido Urgente para que `getPedidoUrgenteData` vuelva a leer
 * `ivaSaldoAcumuladoComparacion` (Posición IVA) y se actualice el criterio de menor costo entre proveedores.
 *
 * Llamar tras cualquier cambio que impacte débito/crédito/saldo manual de IVA.
 * También se invoca desde servicios de persistencia (`importarCsvIvaDebitoMes`, sync compras DUX)
 * para cubrir rutas API o llamadas que no pasen por Server Actions.
 */
export function revalidatePedidoUrgenteTrasCambioIvaSaldo(): void {
  revalidatePath("/pedidos/urgente");
}
