import { redirect } from "next/navigation";

/** Módulo Control Aumentos eliminado — redirige a Control Stock. */
export default function TiendaAumentosPage() {
  redirect("/gestion-productos/tienda/control-stock");
}
