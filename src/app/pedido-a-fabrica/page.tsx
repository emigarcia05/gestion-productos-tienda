import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PERMISOS, puede } from "@/lib/permisos";
import { getRol } from "@/lib/sesion";
import { getProveedoresFabrica } from "@/actions/proveedores";
import PedidoAFabricaPageClient from "@/components/pedido-a-fabrica/PedidoAFabricaPageClient";

export const dynamic = "force-dynamic";

export default async function PedidoAFabricaPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) {
    redirect(GP_ROUTES.defaultEntry);
  }

  const proveedores = await getProveedoresFabrica();
  const proveedoresFabrica = proveedores.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    prefijo: p.prefijo,
  }));

  return (
    <div className="area-page-shell">
      <PedidoAFabricaPageClient proveedoresFabrica={proveedoresFabrica} />
    </div>
  );
}
