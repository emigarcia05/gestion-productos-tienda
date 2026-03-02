import { getTiendaPageData } from "@/actions/tienda";
import SectionHeader from "@/components/SectionHeader";
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

  const acciones = puede(rol, PERMISOS.tienda.acciones.sincronizar) ? <SyncButton /> : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader titulo="Lista Tienda" subtitulo="Comparación Px Proveedores" actions={acciones} />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2">
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
      </div>

      {/* Tabla con scroll interno */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3">
        <TablaTienda items={items} setMejorPrecio={setMejorPrecio} rol={rol} />
      </div>

      {/* Paginación fija abajo */}
      <div className="shrink-0 border-t border-border/50 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
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
  );
}
