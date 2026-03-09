import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import { Separator } from "@/components/ui/separator";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import TablaProveedoresGestion from "@/components/proveedores/TablaProveedoresGestion";

export const dynamic = "force-dynamic";

export default async function GestionProveedoresPage() {
  const [proveedores, rol] = await Promise.all([getProveedores(), getRol()]);
  const p = PERMISOS.proveedores;

  const acciones =
    puede(rol, p.acciones.nuevoProveedor) ? (
      <div className="flex gap-2">
        <CrearProveedorModal />
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Lista Proveedores"
        subtitulo="Lista Proveedores (gestión de empresas)"
        actions={acciones}
      />

      <Separator className="bg-slate-200/60" />

      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <TablaProveedoresGestion proveedores={proveedores} />
      </div>
    </div>
  );
}
