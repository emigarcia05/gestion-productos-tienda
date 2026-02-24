import PageHeader from "@/components/PageHeader";
import { getPedidosTabs } from "@/lib/pedidosTabs";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PedidoTintometricoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/");

  const tabs = getPedidosTabs("tintometrico");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PageHeader
        volverHref="/"
        titulo="Pedidos a Proveedores"
        mostrarTienda={puede(rol, PERMISOS.tienda.acceso)}
        mostrarStock={puede(rol, PERMISOS.stock.acceso)}
        tabs={tabs}
      />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Pedido Tintométrico — en construcción.</p>
      </div>
    </div>
  );
}
