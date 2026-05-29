"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import ExportarPxButton from "@/components/px-listas/ExportarPxButton";
import FiltrosPxListas from "@/components/px-listas/FiltrosPxListas";
import TablaPxListas from "@/components/px-listas/TablaPxListas";
import { PAGE_SIZE } from "@/lib/pagination";
import type { OrdenMarcacionPxListas } from "@/lib/pxListasFiltros";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import type { CompetidorFiltroPxListas } from "@/services/pxListasPage.service";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

const BASE_PATH = "/gestion-productos/tienda/cx-px-tienda";

interface Props {
  items: ItemPxListasParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  competidores: CompetidorFiltroPxListas[];
  rol: Rol;
  q: string;
  rubro: string;
  marca: string;
  detPrecio: string;
  ordenMarcacion: OrdenMarcacionPxListas;
  paginaNum: number;
}

export default function PxListasPageClient({
  items,
  total,
  totalPaginas,
  marcas,
  rubros,
  competidores,
  rol,
  q,
  rubro,
  marca,
  detPrecio,
  ordenMarcacion,
  paginaNum,
}: Props) {
  const puedeEditar = puede(rol, PERMISOS.cxPxTienda.acceso);
  const filters = (
    <FiltrosPxListas
      marcas={marcas.map((m) => m.marca)}
      rubros={rubros.map((r) => r.rubro)}
      competidores={competidores}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      detPrecioActual={detPrecio}
      ordenMarcacionActual={ordenMarcacion}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Px Listas"
        filters={filters}
        actions={puedeEditar ? <ExportarPxButton /> : undefined}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaPxListas items={items} puedeEditar={puedeEditar} />
          </div>
          {totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath={BASE_PATH}
                params={{ q, rubro, marca, detPrecio, ordenMarcacion }}
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
