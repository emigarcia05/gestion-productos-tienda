import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getProveedoresPageData } from "@/actions/proveedores";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";
import TablaListaPreciosConPedido from "@/components/proveedores/TablaListaPreciosConPedido";
import FiltrosProductos from "@/components/proveedores/FiltrosProductos";
import BuscadorSimple from "@/components/proveedores/BuscadorSimple";
import AccionMasivaModal from "@/components/proveedores/AccionMasivaModal";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; proveedor?: string; pagina?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const rol = await getRol();
  if (rol === "simple") redirect(GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido);

  const { q = "", proveedor = "" } = await searchParams;
  const p = PERMISOS.proveedores;
  const esEditor = rol === "editor";

  const { proveedores, productos, total } = await getProveedoresPageData({ q, proveedor });
  const hasFiltros = !!(q || proveedor);

  const titulo = "Lista Proveedores";

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
    <div className="area-page-shell">
      <SectionHeader titulo={titulo} subtitulo="Lista Proveedores" actions={acciones} />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-8 pt-4 pb-2">
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

      <Separator className="bg-border" />

      {/* Card con tabla */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-8 pb-3 flex flex-col">
        <Card className={cn("card-tabla-envoltorio", "flex-1")}>
          <CardContent className="flex-1 min-h-0 p-0">
            <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
              {esEditor ? (
                <TablaProductosFiltrada productos={productos} rol={rol} sinFiltros={!hasFiltros} />
              ) : (
                <TablaListaPreciosConPedido productos={productos} sinFiltros={!hasFiltros} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
