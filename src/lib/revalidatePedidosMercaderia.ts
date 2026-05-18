import { revalidatePath } from "next/cache";

/** Rutas internas (`app/pedidos/...`) y alias públicos (`/gestion-productos/pedidos/...`). */
const PEDIDOS_MERCADERIA_PATHS = [
  "/pedidos/enviar",
  "/pedidos/urgente",
  "/pedidos/tintometrico",
  "/pedidos/reposicion",
  "/pedidos/historial",
  "/gestion-productos/pedidos/generar-pedido",
  "/gestion-productos/pedidos/urgente",
  "/gestion-productos/pedidos/tintometrico",
  "/gestion-productos/pedidos/reposicion",
  "/gestion-productos/pedidos/historial",
] as const;

/** Invalida listados de pedido tras generar PDF, borrar mercadería o cambios de IVA comparables. */
export function revalidatePedidosMercaderiaListados(): void {
  for (const path of PEDIDOS_MERCADERIA_PATHS) {
    revalidatePath(path);
  }
}
