"use client";

import { useRef } from "react";
import SectionHeader from "@/components/SectionHeader";
import TablaStock from "@/components/stock/TablaStock";
import StockPageSyncGate from "@/components/stock/StockPageSyncGate";
import ImprimirStockButton from "@/components/stock/ImprimirStockButton";
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
}

export default function StockPageWithActions({
  data,
  sucursalValida,
  q,
  marca,
  rubro,
  subRubro,
}: Props) {
  const tableRef = useRef<TablaStockHandle>(null);
  const tieneSucursal = sucursalValida !== null;
  const tieneItems = data.items.length > 0;

  const actions = (
    <div className="flex items-center justify-end gap-2">
      <SyncDuxHeaderButton />
      {tieneSucursal && tieneItems && (
        <ImprimirStockButton tableRef={tableRef} />
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Control Stock"
        subtitulo="Por sucursal"
        actions={actions}
      />
      <StockPageSyncGate>
        <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3 pt-3">
          <TablaStock
            ref={tableRef}
            data={data}
            sucursalActual={sucursalValida}
            qActual={q}
            marcaActual={marca}
            rubroActual={rubro}
            subRubroActual={subRubro}
          />
        </div>
      </StockPageSyncGate>
    </div>
  );
}
