import { redirect } from "next/navigation";
import { getTiendaPageData } from "@/actions/tienda";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import SyncDuxHeaderButton from "@/components/shared/SyncDuxHeaderButton";
import TablaTienda from "@/components/tienda/TablaTienda";
import FiltrosTienda from "@/components/tienda/FiltrosTienda";
import { PAGE_SIZE } from "@/lib/pagination";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    rubro?: string;
    subRubro?: string;
    marca?: string;
    proveedor?: string;
    mejorPrecio?: string;
    pagina?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) redirect("/stock");

  const {
    q = "",
    rubro = "",
    subRubro = "",
    marca = "",
    proveedor = "",
    mejorPrecio = "",
    pagina = "1",
  } = await searchParams;

  const { items, total, totalPaginas, proveedores, marcas, rubros, subRubros, setMejorPrecio } =
    await getTiendaPageData({
      q,
      rubro,
      subRubro,
      marca,
      proveedor,
      mejorPrecio,
      pagina,
    });
  const hasFiltros = !!(q || rubro || subRubro || marca || proveedor || mejorPrecio);
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  const actions = puede(rol, PERMISOS.tienda.acciones.sincronizar) ? <SyncDuxHeaderButton /> : undefined;

  const filters = (
    <FiltrosTienda
      marcas={marcas.map((m) => m.marca!)}
      rubros={rubros.map((r) => r.rubro!)}
      subRubros={subRubros.map((s) => s.subRubro!)}
      proveedores={proveedores}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
      proveedorActual={proveedor}
      mejorPrecioActual={mejorPrecio}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Lista Tienda"
        subtitle="Comp. Px. Prov."
        actions={actions}
        filters={filters}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0">
            <TablaTienda items={items} setMejorPrecio={setMejorPrecio} rol={rol} sinFiltros={!hasFiltros} />
          </div>
          {hasFiltros && totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/tienda"
                params={{ q, rubro, subRubro, marca, proveedor, mejorPrecio }}
                paginaActual={paginaNum}
                totalPaginas={totalPaginas}
                total={total}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
