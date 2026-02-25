import SectionHeader from "@/components/SectionHeader";
import PedidosSectionActions from "@/components/pedidos/PedidosSectionActions";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GenerarPedidoPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Pedidos a Proveedores"
        descripcion="Armá pedidos urgentes, por reposición, tintométricos o generá el archivo para enviar."
        submoduleToolbar={<PedidosSectionActions activo="generar" />}
      />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Generar Pedido — en construcción.</p>
      </div>
    </div>
  );
}
