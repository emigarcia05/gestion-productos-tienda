"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosTransfDepositos from "@/components/stock/FiltrosTransfDepositos";
import TablaTransfDepositos from "@/components/stock/TablaTransfDepositos";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { PAGE_SIZE } from "@/lib/pagination";
import type { Sucursal, TransfDepositosData } from "@/actions/stock";

interface Props {
  data: TransfDepositosData;
  origen: Sucursal | null;
  destino: Sucursal | null;
  q: string;
  marca: string;
  rubro: string;
  paginaNum: number;
  paramsPagina: Record<string, string>;
}

/**
 * Pantalla **Stock · Trans. Depósitos**: origen/destino → marca/rubro/búsqueda;
 * grilla DESCRIPCIÓN / {origen} / → / {destino} / CONTROL / ACCIONES.
 */
export default function TransfDepositosPageClient({
  data,
  origen,
  destino,
  q,
  marca,
  rubro,
  paginaNum,
  paramsPagina,
}: Props) {
  const tieneOrigen = origen !== null;

  const filters = (
    <FiltrosTransfDepositos
      data={data}
      origenActual={origen}
      destinoActual={destino}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      totalItems={data.total}
    />
  );

  return (
    <ClassicFilteredTableLayout
      title="Stock"
      subtitle="Trans. Depósitos"
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <TablaTransfDepositos
            data={data}
            origen={origen}
            destino={destino}
          />
        </div>
        {tieneOrigen && data.totalPaginas > 1 && (
          <div className="flex justify-end pt-2 shrink-0">
            <PaginacionTabla
              basePath={GP_ROUTES.ayudaVendedor.transfDepositos}
              params={paramsPagina}
              paginaActual={paginaNum}
              totalPaginas={data.totalPaginas}
              total={data.total}
              pageSize={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </ClassicFilteredTableLayout>
  );
}
