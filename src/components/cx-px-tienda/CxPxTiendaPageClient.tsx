"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import ExportarCxButton from "@/components/cx-px-tienda/ExportarCxButton";
import ExportarPxButton from "@/components/cx-px-tienda/ExportarPxButton";
import FiltrosCxPxTienda from "@/components/cx-px-tienda/FiltrosCxPxTienda";
import TablaCxPxTienda from "@/components/cx-px-tienda/TablaCxPxTienda";
import { PAGE_SIZE } from "@/lib/pagination";
import type {
  CompetenciaCxPxFiltro,
  ItemCxPxTiendaParaTabla,
  ProveedorCxPxFiltro,
} from "@/lib/cxPxTienda";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

interface Props {
  items: ItemCxPxTiendaParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  proveedores: ProveedorCxPxFiltro[];
  competencias: CompetenciaCxPxFiltro[];
  rol: Rol;
  q: string;
  marca: string;
  vincCosto: string;
  costoProv: string;
  pxLista: string;
  marcacionOrden: string;
  paginaNum: number;
}

export default function CxPxTiendaPageClient({
  items,
  total,
  totalPaginas,
  marcas,
  q,
  rol,
  marca,
  proveedores,
  competencias,
  vincCosto,
  costoProv,
  pxLista,
  marcacionOrden,
  paginaNum,
}: Props) {
  const puedeEditar = puede(rol, PERMISOS.cxPxTienda.acceso);
  const filters = (
    <FiltrosCxPxTienda
      marcas={marcas.map((m) => m.marca)}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      proveedores={proveedores}
      competencias={competencias}
      vincCostoActual={vincCosto}
      costoProvActual={costoProv}
      pxListaActual={pxLista}
      marcacionOrdenActual={marcacionOrden}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Cx & Px Tienda"
        filters={filters}
        actions={
          puedeEditar ? (
            <div className="flex flex-wrap items-center gap-2">
              <ExportarCxButton />
              <ExportarPxButton />
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaCxPxTienda items={items} puedeEditar={puedeEditar} />
          </div>
          {total > PAGE_SIZE && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/gestion-productos/tienda/cx-px-tienda"
                params={{ q, marca, vincCosto, costoProv, pxLista, marcacionOrden }}
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
