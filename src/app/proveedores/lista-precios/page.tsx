import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import ListaPreciosTablaConFiltros from "@/components/proveedores/ListaPreciosTablaConFiltros";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol] = await Promise.all([getProveedores(), getRol()]);
  const p = PERMISOS.listaPrecios;

  const filas = await prisma.listaPrecioProveedor.findMany({
    include: { proveedor: true },
    orderBy: { codExt: "asc" },
  });

  const acciones =
    puede(rol, p.acciones.importarLista) ? (
      <ImportarListaPreciosModal proveedores={proveedores} />
    ) : undefined;

  const filasParaCliente = filas.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    descripcionProveedor: f.descripcionProveedor,
    pxListaProveedor: Number(f.pxListaProveedor),
    dtoProducto: f.dtoProducto,
    dtoCantidad: f.dtoCantidad,
    cxAproxTransporte: f.cxAproxTransporte,
    pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
    proveedor: f.proveedor
      ? { id: f.proveedor.id, sufijo: f.proveedor.sufijo }
      : null,
  }));

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
      />
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <ListaPreciosTablaConFiltros
          filas={filasParaCliente}
          proveedores={proveedoresParaCliente}
        />
      </div>
    </div>
  );
}
