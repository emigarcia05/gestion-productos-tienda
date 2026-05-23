"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import ExportarCxButton from "@/components/cx-px-tienda/ExportarCxButton";
import FiltrosCxPxTienda from "@/components/cx-px-tienda/FiltrosCxPxTienda";
import TablaCxPxTienda from "@/components/cx-px-tienda/TablaCxPxTienda";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ItemCxPxTiendaParaTabla, ProveedorCxPxFiltro } from "@/lib/cxPxTienda";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

interface Props {
  items: ItemCxPxTiendaParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  proveedores: ProveedorCxPxFiltro[];
  rol: Rol;
  q: string;
  rubro: string;
  marca: string;
  vincCosto: string;
  costoProv: string;
  paginaNum: number;
}

export default function CxPxTiendaPageClient({
  items,
  total,
  totalPaginas,
  marcas,
  rubros,
  q,
  rubro,
  rol,
  marca,
  proveedores,
  vincCosto,
  costoProv,
  paginaNum,
}: Props) {
  const puedeEditar = puede(rol, PERMISOS.cxPxTienda.acceso);
  const filters = (
    <FiltrosCxPxTienda
      marcas={marcas.map((m) => m.marca)}
      rubros={rubros.map((r) => r.rubro)}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      proveedores={proveedores}
      vincCostoActual={vincCosto}
      costoProvActual={costoProv}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Cx & Px Tienda"
        filters={filters}
        actions={puedeEditar ? <ExportarCxButton /> : undefined}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaCxPxTienda items={items} puedeEditar={puedeEditar} />
          </div>
          {total > PAGE_SIZE && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/gestion-productos/tienda/cx-px-tienda"
                params={{ q, rubro, marca, vincCosto, costoProv }}
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
