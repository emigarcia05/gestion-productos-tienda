"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import FiltrosCxPxTienda from "@/components/cx-px-tienda/FiltrosCxPxTienda";
import TablaCxPxTienda from "@/components/cx-px-tienda/TablaCxPxTienda";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ItemCxPxTiendaParaTabla } from "@/actions/cxPxTienda";

interface Props {
  items: ItemCxPxTiendaParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  subRubros: Array<{ subRubro: string }>;
  q: string;
  rubro: string;
  subRubro: string;
  marca: string;
  paginaNum: number;
}

export default function CxPxTiendaPageClient({
  items,
  total,
  totalPaginas,
  marcas,
  rubros,
  subRubros,
  q,
  rubro,
  subRubro,
  marca,
  paginaNum,
}: Props) {
  const filters = (
    <FiltrosCxPxTienda
      marcas={marcas.map((m) => m.marca)}
      rubros={rubros.map((r) => r.rubro)}
      subRubros={subRubros.map((s) => s.subRubro)}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout title="Cx y Px Tienda" filters={filters}>
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaCxPxTienda items={items} />
          </div>
          {totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/gestion-productos/tienda/cx-px-tienda"
                params={{ q, rubro, subRubro, marca }}
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
