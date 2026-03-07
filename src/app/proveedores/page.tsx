import { getProveedoresPageData } from "@/actions/proveedores";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";
import TablaListaPreciosConPedido from "@/components/proveedores/TablaListaPreciosConPedido";
import FiltrosProductos from "@/components/proveedores/FiltrosProductos";
import BuscadorSimple from "@/components/proveedores/BuscadorSimple";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import AccionMasivaModal from "@/components/proveedores/AccionMasivaModal";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; proveedor?: string; pagina?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const { q = "", proveedor = "", pagina = "1" } = await searchParams;
  const rol = await getRol();
  const p = PERMISOS.proveedores;
  const esEditor = rol === "editor";

  const { proveedores, productos, total, totalPaginas } = await getProveedoresPageData({ q, proveedor, pagina });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const hasFiltros = !!(q || proveedor);

  const titulo = "Proveedores";

  const acciones =
    esEditor && (puede(rol, p.acciones.importarLista) || puede(rol, p.acciones.accionMasiva)) ? (
      <div className="flex gap-2">
        {puede(rol, p.acciones.importarLista) && <ImportarModal proveedores={proveedores} />}
        {puede(rol, p.acciones.accionMasiva) && (
          <AccionMasivaModal
            proveedores={proveedores}
            filtroProveedorActual={proveedor}
            filtroBusquedaActual={q}
            totalFiltrado={total}
          />
        )}
      </div>
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader titulo={titulo} subtitulo="Proveedores" actions={acciones} />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        {esEditor ? (
          <FiltrosProductos
            proveedores={proveedores}
            totalProductos={total}
            qActual={q}
            proveedorActual={proveedor}
          />
        ) : (
          <BuscadorSimple qActual={q} totalProductos={total} />
        )}
      </div>

      <Separator className="bg-slate-200/60" />

      {/* Card con tabla */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3 flex flex-col">
        <Card className="flex-1 min-h-0 flex flex-col rounded-xl border-slate-200 bg-white overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 overflow-auto p-0">
            {esEditor
              ? <TablaProductosFiltrada productos={productos} rol={rol} sinFiltros={!hasFiltros} />
              : <TablaListaPreciosConPedido productos={productos} sinFiltros={!hasFiltros} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Paginación */}
      <div className="shrink-0 border-t border-slate-200/60 bg-white/80 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor={esEditor ? proveedor : ""}
        />
      </div>
    </div>
  );
}
