import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol] = await Promise.all([getProveedores(), getRol()]);
  const p = PERMISOS.proveedores;

  const acciones =
    puede(rol, p.acciones.importarLista) ? (
      <ImportarListaPreciosModal proveedores={proveedores} />
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Lista Proveedores"
        subtitulo="Lista Px Proveedores"
        actions={acciones}
      />
      {/* Contenido de la lista de precios (tabla u otro) según diseño existente */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4" />
    </div>
  );
}
