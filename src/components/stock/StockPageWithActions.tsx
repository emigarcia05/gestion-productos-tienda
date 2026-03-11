"use client";

import { useRef, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaStock from "@/components/stock/TablaStock";
import FiltrosStock from "@/components/stock/FiltrosStock";
import StockPageSyncGate from "@/components/stock/StockPageSyncGate";
import ImprimirStockButton from "@/components/stock/ImprimirStockButton";
import ExportarStockButton from "@/components/stock/ExportarStockButton";
import type { ControlStockData, Sucursal } from "@/actions/stock";
import type { TablaStockHandle } from "./TablaStock";
import SyncDuxHeaderButton from "@/components/shared/SyncDuxHeaderButton";

interface Props {
  data: ControlStockData;
  sucursalValida: Sucursal | null;
  q: string;
  marca: string;
  rubro: string;
  subRubro: string;
  soloNegativo: boolean;
}

export default function StockPageWithActions({
  data,
  sucursalValida,
  q,
  marca,
  rubro,
  subRubro,
  soloNegativo,
}: Props) {
  const tableRef = useRef<TablaStockHandle>(null);
  const [totalFiltrados, setTotalFiltrados] = useState<number>(data.items.length);

  const tieneSucursal = sucursalValida !== null;
  const tieneItems = data.items.length > 0;

  const actions = (
    <div className="flex items-center justify-end gap-2">
      <SyncDuxHeaderButton />
      {tieneSucursal && tieneItems && (
        <>
          <ExportarStockButton tableRef={tableRef} />
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
        </div>
      </ClassicFilteredTableLayout>
    </StockPageSyncGate>
  );
}

