import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";

export const dynamic = "force-dynamic";

export default function GenerarPedidoPage() {
  redirect(GP_ROUTES.pedidoMercaderia.recepcionPedido);
}
