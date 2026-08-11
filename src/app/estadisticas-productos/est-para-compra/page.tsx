import { permanentRedirect } from "next/navigation";
import { PEDIDO_A_FABRICA_ROUTES } from "@/lib/pedidoAFabricaRoutes";

/** Compatibilidad: Est. Para Compra → Pedido A Fábrica. */
export default function EstParaCompraLegacyRedirectPage() {
  permanentRedirect(PEDIDO_A_FABRICA_ROUTES.defaultEntry);
}
