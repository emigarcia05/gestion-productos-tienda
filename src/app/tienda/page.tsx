import { getTiendaPageData } from "@/actions/tienda";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import SyncButton from "@/components/tienda/SyncButton";
import TablaTienda from "@/components/tienda/TablaTienda";
import FiltrosTienda from "@/components/tienda/FiltrosTienda";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    subRubro?: string;
    marca?: string;
    habilitado?: string;
    mejorPrecio?: string;
    pagina?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: Props) {
  const { q = "", rubro = "", subRubro = "", marca = "", habilitado = "", mejorPrecio = "", pagina = "1" } = await searchParams;
  const rol = await getRol();

  const { items, total, marcas, rubros, subRubros, setMejorPrecio, totalPaginas } = await getTiendaPageData({
    q, rubro, subRubro, marca, habilitado, mejorPrecio, pagina,
  });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const hasFiltros = !!(q || rubro || subRubro || marca || habilitado || mejorPrecio);

  const actions = puede(rol, PERMISOS.tienda.acciones.sincronizar) ? <SyncButton /> : undefined;

  const filters = (
    <FiltrosTienda
      marcas={marcas.map((m) => m.marca!)}
      rubros={rubros.map((r) => r.rubro!)}
      subRubros={subRubros.map((s) => s.subRubro!)}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
      habilitadoActual={habilitado}
      mejorPrecioActual={mejorPrecio}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Lista Tienda"
        subtitle="Comparación Px Proveedores"
        actions={actions}
        filters={filters}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0">
            <TablaTienda items={items} setMejorPrecio={setMejorPrecio} rol={rol} sinFiltros={!hasFiltros} />
          </div>
          <div className="shrink-0 border-t border-border/50 py-3">
            <PaginacionProductos
              paginaActual={paginaNum}
              totalPaginas={totalPaginas}
              total={total}
              pageSize={PAGE_SIZE}
              q={q}
              proveedor=""
              basePath="/tienda"
              extraParams={{ marca, rubro, subRubro, habilitado, mejorPrecio }}
            />
          </div>
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
