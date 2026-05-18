import { revalidatePath } from "next/cache";

/**
 * Invalida pantallas de pedido que resuelven proveedor por menor costo comparable (Posición IVA).
 *
 * Llamar tras cualquier cambio que impacte débito/crédito/saldo manual de IVA.
 * También se invoca desde servicios de persistencia (`importarCsvIvaDebitoMes`, sync compras DUX)
 * para cubrir rutas API o llamadas que no pasen por Server Actions.
 */
export function revalidatePedidoUrgenteTrasCambioIvaSaldo(): void {
  revalidatePath("/pedidos/urgente");
  revalidatePath("/pedidos/enviar");
  revalidatePath("/pedidos/reposicion");
  revalidatePath("/gestion-productos/pedidos/urgente");
  revalidatePath("/gestion-productos/pedidos/generar-pedido");
  revalidatePath("/gestion-productos/pedidos/reposicion");
}
