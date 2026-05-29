"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import FiltrosTienda from "@/components/tienda/FiltrosTienda";
import TablaPxListas from "@/components/px-listas/TablaPxListas";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import type { ProveedorTintoLts } from "@/actions/tienda";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

const BASE_PATH = "/gestion-productos/tienda/cx-px-tienda";

interface Props {
  items: ItemPxListasParaTabla[];
  total: number;
  totalPaginas: number;
  proveedores: ProveedorTintoLts[];
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  subRubros: Array<{ subRubro: string }>;
  rol: Rol;
  q: string;
  rubro: string;
  subRubro: string;
  marca: string;
  proveedor: string;
  vinculado: string;
  paginaNum: number;
}

export default function PxListasPageClient({
  items,
  total,
  totalPaginas,
  proveedores,
  marcas,
  rubros,
  subRubros,
  rol,
  q,
  rubro,
  subRubro,
  marca,
  proveedor,
  vinculado,
  paginaNum,
}: Props) {
  const puedeEditar = puede(rol, PERMISOS.cxPxTienda.acceso);
  const filters = (
    <FiltrosTienda
      marcas={marcas.map((m) => m.marca)}
      rubros={rubros.map((r) => r.rubro)}
      subRubros={subRubros.map((s) => s.subRubro)}
      proveedores={proveedores}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
      proveedorActual={proveedor}
      vinculadoActual={vinculado}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout title="Px Listas" filters={filters}>
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaPxListas items={items} puedeEditar={puedeEditar} />
          </div>
          {totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath={BASE_PATH}
                params={{ q, rubro, subRubro, marca, proveedor, vinculado }}
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
