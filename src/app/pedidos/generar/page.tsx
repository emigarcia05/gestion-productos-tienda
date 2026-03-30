import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function GenerarPedidoPage() {
  redirect("/gestion-productos/pedidos/historial");
}
