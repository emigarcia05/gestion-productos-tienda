import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PedidosRootPage() {
  redirect("/gestion-productos/pedidos/urgente");
}
