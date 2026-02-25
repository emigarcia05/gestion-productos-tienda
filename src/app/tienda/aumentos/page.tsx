import { redirect } from "next/navigation";
import { TrendingUp, Link2 } from "lucide-react";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getControlAumentos } from "@/actions/tienda";
import TablaAumentos from "@/components/tienda/TablaAumentos";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ControlAumentosPage() {
  const rol = await getRol();
  if (rol !== "editor") redirect("/tienda");

  const data = await getControlAumentos();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PageHeader
        volverHref="/tienda"
        titulo="Lista TiendaColor"
        mostrarTienda
        mostrarStock={puede(rol, PERMISOS.stock.acceso)}
        tabs={[
          { label: "Productos Relacionados", href: "/tienda", active: false, icon: <Link2 className="h-3.5 w-3.5 text-accent2" /> },
          { label: "Control de Aumentos", active: true, icon: <TrendingUp className="h-3.5 w-3.5 text-accent2" /> },
        ]}
      />

      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-4">
        <TablaAumentos data={data} />
      </div>
    </div>
  );
}
