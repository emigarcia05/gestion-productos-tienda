import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";
import FiltrosProductos from "@/components/proveedores/FiltrosProductos";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import AccionMasivaModal from "@/components/proveedores/AccionMasivaModal";
import PageHeader from "@/components/PageHeader";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; proveedor?: string; pagina?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const { q = "", proveedor = "", pagina = "1" } = await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const rol = await getRol();
  const p = PERMISOS.proveedores;

  const where = {
    ...(proveedor ? { proveedorId: proveedor } : {}),
    ...(q ? filtroTexto(q, ["descripcion", "codExt", "codProdProv"]) : {}),
  };

  const [proveedores, productos, total] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    prisma.producto.findMany({
      where,
      orderBy: { codExt: "asc" },
      skip,
      take: PAGE_SIZE,
      include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
    }),
    prisma.producto.count({ where }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PageHeader
        volverHref="/"
        titulo="Lista Proveedores"
        subtitulo={`${total.toLocaleString()} producto${total !== 1 ? "s" : ""}`}
        acciones={
          <>
            {puede(rol, p.acciones.nuevoProveedor) && <CrearProveedorModal />}
            {puede(rol, p.acciones.importarLista) && <ImportarModal proveedores={proveedores} />}
          </>
        }
        tabs={[{ label: "Productos", active: true }]}
      />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        <FiltrosProductos
          proveedores={proveedores}
          totalProductos={total}
          qActual={q}
          proveedorActual={proveedor}
          accionMasivaSlot={
            puede(rol, p.acciones.accionMasiva) ? (
              <AccionMasivaModal
                proveedores={proveedores}
                filtroProveedorActual={proveedor}
                filtroBusquedaActual={q}
                totalFiltrado={total}
              />
            ) : undefined
          }
        />
      </div>

      {/* Tabla con scroll interno */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3">
        <TablaProductosFiltrada productos={productos} rol={rol} />
      </div>

      {/* Paginación fija abajo */}
      <div className="shrink-0 border-t border-border/50 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor={proveedor}
        />
      </div>
    </div>
  );
}
