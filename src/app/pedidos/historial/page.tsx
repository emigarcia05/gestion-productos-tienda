import SectionHeader from "@/components/SectionHeader";
import GenerarPedidoButton from "@/components/pedidos/GenerarPedidoButton";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HistorialPedidosPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) redirect("/proveedores");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader titulo="Pedido Mercadería" subtitulo="Historial Pedidos" actions={<GenerarPedidoButton />} />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Historial Pedidos — en construcción.</p>
      </div>
    </div>
  );
}
