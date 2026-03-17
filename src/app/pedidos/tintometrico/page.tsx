import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { redirect } from "next/navigation";
import PedidoTintometricoPageClient from "@/components/pedidos/PedidoTintometricoPageClient";
import { getProveedoresTintometricos } from "@/services/tintometrico.service";

export const dynamic = "force-dynamic";

export default async function PedidoTintometricoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  const proveedores = await getProveedoresTintometricos();

  return (
    <PedidoTintometricoPageClient proveedores={proveedores} />
  );
}
