import { revalidatePath } from "next/cache";
import { REVALIDATE_PEDIDOS_MERCADERIA } from "@/lib/gestionProductosRoutes";

/** Invalida listados de pedido tras generar PDF, borrar mercadería o cambios de IVA comparables. */
export function revalidatePedidosMercaderiaListados(): void {
  for (const path of REVALIDATE_PEDIDOS_MERCADERIA) {
    revalidatePath(path);
  }
}
