"use client";

import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import FiltrosPxListasPrecios from "@/components/px-listas-precios/FiltrosPxListasPrecios";
import TablaPxListasPrecios from "@/components/px-listas-precios/TablaPxListasPrecios";
import ActPxListasButton from "@/components/px-listas-precios/ActPxListasButton";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ItemPxListasPreciosTabla, ListaPrecioPxListasColumna } from "@/lib/pxListasPrecios";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

const BASE_PATH = GP_ROUTES.analisisPrecios.cxYPxTienda.pxListas;

interface Props {
  items: ItemPxListasPreciosTabla[];
  total: number;
  totalPaginas: number;
  listas: ListaPrecioPxListasColumna[];
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  subRubros: Array<{ subRubro: string }>;
  rol: Rol;
  q: string;
  rubro: string;
  marca: string;
  subRubro: string;
  actualizar: string;
  paginaNum: number;
}

export default function PxListasPreciosPageClient({
  items,
  total,
  totalPaginas,
  listas,
  marcas,
  rubros,
  subRubros,
  rol,
  q,
  rubro,
  marca,
  subRubro,
  actualizar,
  paginaNum,
}: Props) {
  const puedeEditar = puede(rol, PERMISOS.cxPxTienda.acceso);

  return (
    <div className="area-page-shell bg-gris">
      <ClassicFilteredTableLayout
        title="Px Listas"
        filters={
          <FiltrosPxListasPrecios
            marcas={marcas.map((m) => m.marca)}
            rubros={rubros.map((r) => r.rubro)}
            subRubros={subRubros.map((s) => s.subRubro)}
            totalItems={total}
            qActual={q}
            marcaActual={marca}
            rubroActual={rubro}
            subRubroActual={subRubro}
            actualizarActual={actualizar}
          />
        }
        actions={
          puedeEditar ? (
            <div className="flex shrink-0 items-center gap-2">
              <ActPxListasButton />
            </div>
          ) : undefined
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-0.5">
          <div className="contenedor-tabla-gestion flex-1 min-h-0">
            <TablaPxListasPrecios
              items={items}
              listas={listas}
              puedeEditar={puedeEditar}
            />
          </div>
          {totalPaginas > 1 ? (
            <div className="flex shrink-0 justify-end pt-2">
              <PaginacionTabla
                basePath={BASE_PATH}
                params={{ q, rubro, marca, subRubro, actualizar }}
                paginaActual={paginaNum}
                totalPaginas={totalPaginas}
                total={total}
                pageSize={PAGE_SIZE}
              />
            </div>
          ) : null}
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
