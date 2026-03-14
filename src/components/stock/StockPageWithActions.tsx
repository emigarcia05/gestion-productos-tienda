"use client";

import { useRef, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaStock from "@/components/stock/TablaStock";
import FiltrosStock from "@/components/stock/FiltrosStock";
import StockPageSyncGate from "@/components/stock/StockPageSyncGate";
import ImprimirStockButton from "@/components/stock/ImprimirStockButton";
import ExportarStockButton from "@/components/stock/ExportarStockButton";
import ExportarStockInstructorModal from "@/components/stock/ExportarStockInstructorModal";
import type { ControlStockData, Sucursal } from "@/actions/stock";
import type { TablaStockHandle } from "./TablaStock";
import SyncDuxHeaderButton from "@/components/shared/SyncDuxHeaderButton";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { PAGE_SIZE } from "@/lib/pagination";

interface Props {
  data: ControlStockData;
  sucursalValida: Sucursal | null;
  q: string;
  marca: string;
  rubro: string;
  subRubro: string;
  soloNegativo: boolean;
  paginaNum: number;
  paramsPagina: Record<string, string>;
}

export default function StockPageWithActions({
  data,
  sucursalValida,
  q,
  marca,
  rubro,
  subRubro,
  soloNegativo,
  paginaNum,
  paramsPagina,
}: Props) {
  const tableRef = useRef<TablaStockHandle>(null);
  const [totalFiltrados, setTotalFiltrados] = useState<number>(data.items.length);
  const [showInstructor, setShowInstructor] = useState(false);

  const tieneSucursal = sucursalValida !== null;
  const tieneItems = data.items.length > 0;

  const actions = (
    <div className="flex items-center justify-end gap-2">
      <SyncDuxHeaderButton />
      {tieneSucursal && tieneItems && (
        <>
          <ExportarStockButton
            tableRef={tableRef}
            onAfterExport={() => setShowInstructor(true)}
          />
          <ImprimirStockButton tableRef={tableRef} />
        </>
      )}
    </div>
  );

  const filters = (
    <FiltrosStock
      data={data}
      sucursalActual={sucursalValida}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
      soloNegativoActual={soloNegativo}
      totalItems={totalFiltrados}
    />
  );

  return (
    <StockPageSyncGate>
      <ExportarStockInstructorModal open={showInstructor} onOpenChange={setShowInstructor} />
      <ClassicFilteredTableLayout
        title="Lista Tienda"
        subtitle="Control Stock"
        actions={actions}
        filters={filters}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0">
            <TablaStock
              ref={tableRef}
              data={data}
              sucursalActual={sucursalValida}
              qActual={q}
              marcaActual={marca}
              rubroActual={rubro}
              subRubroActual={subRubro}
              soloNegativoActual={soloNegativo}
              onFiltradosCountChange={setTotalFiltrados}
            />
          </div>
          {tieneSucursal && data.totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/stock"
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
    </StockPageSyncGate>
  );
}

