import PageHeader from "@/components/PageHeader";
import { getRol } from "@/lib/sesion";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  await getRol();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PageHeader
        volverHref="/"
        titulo="Pedido a Proveedores"
        tabs={[{ label: "Pedido a Proveedores", active: true, icon: <ClipboardList className="h-3.5 w-3.5 text-accent2" /> }]}
      />

      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Módulo en construcción.</p>
      </div>
    </div>
  );
}
