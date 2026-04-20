import { redirect } from "next/navigation";
import { getProveedoresMercaderia } from "@/actions/proveedores";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import TablaProveedoresLista from "@/components/proveedores/TablaProveedoresLista";

export const dynamic = "force-dynamic";

export default async function ListaProveedoresPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.proveedores.lista)) redirect("/gestion-productos/proveedores/sugeridos");

  const [proveedores] = await Promise.all([getProveedoresMercaderia()]);
  const p = PERMISOS.proveedores;

  const actions =
    puede(rol, p.acciones.nuevoProveedor) ? (
      <div className="flex gap-2">
        <CrearProveedorModal />
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ClassicFilteredTableLayout title="Lista Proveedores" subtitle="Proveedores" actions={actions}>
        <TablaProveedoresLista proveedores={proveedores} />
      </ClassicFilteredTableLayout>
    </div>
  );
}
