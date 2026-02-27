import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import ListaPreciosTablaConFiltros from "@/components/proveedores/ListaPreciosTablaConFiltros";
import { getListaPreciosConTienda } from "@/services/listaPrecios.service";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol, filasParaCliente] = await Promise.all([
    getProveedores(),
    getRol(),
    getListaPreciosConTienda(),
  ]);
  const p = PERMISOS.listaPrecios;

  const acciones =
    puede(rol, p.acciones.importarLista) ? (
      <ImportarListaPreciosModal proveedores={proveedores} />
    ) : undefined;

  const proveedoresParaCliente = proveedores.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sufijo: p.sufijo,
  }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Lista Proveedores"
        subtitulo="Lista Px Proveedores"
        actions={acciones}
        compact
      />
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-1.5">
        <ListaPreciosTablaConFiltros
          filas={filasParaCliente}
          proveedores={proveedoresParaCliente}
        />
      </div>
    </div>
  );
}
