"use client";

import { useRef, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaStock from "@/components/stock/TablaStock";
import FiltrosStock from "@/components/stock/FiltrosStock";
import ImprimirStockButton from "@/components/stock/ImprimirStockButton";
import ExportarStockButton from "@/components/stock/ExportarStockButton";
import ExportarStockInstructorModal from "@/components/stock/ExportarStockInstructorModal";
import EditarCoeficientesModal from "@/components/stock/EditarCoeficientesModal";
import type { ControlStockData, Sucursal } from "@/actions/stock";
import type { TablaStockHandle } from "./TablaStock";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { PAGE_SIZE } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Props {
  data: ControlStockData;
  esEditor: boolean;
  proveedores: {
    id: string;
    nombre: string;
    coeficienteTintometrico: number;
  }[];
  sucursalValida: Sucursal | null;
  q: string;
  marca: string;
  rubro: string;
  soloNegativo: boolean;
  orden: string;
  paginaNum: number;
  paramsPagina: Record<string, string>;
}

export default function StockPageWithActions({
  data,
  esEditor,
  proveedores,
  sucursalValida,
  q,
  marca,
  rubro,
  soloNegativo,
  orden,
  paginaNum,
  paramsPagina,
}: Props) {
  const router = useRouter();
  const tableRef = useRef<TablaStockHandle>(null);
  const [totalFiltrados, setTotalFiltrados] = useState<number>(data.items.length);
  const [showInstructor, setShowInstructor] = useState(false);
  const [editarCoefOpen, setEditarCoefOpen] = useState(false);

  const tieneSucursal = sucursalValida !== null;
  const tieneItems = data.items.length > 0;

  const actions = (
    <div className="flex w-full items-center justify-between gap-2">
      <div>
        {esEditor ? (
          <Button type="button" variant="outline" onClick={() => setEditarCoefOpen(true)}>
            Editar Coeficientes
          </Button>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2">
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
    </div>
  );

  const filters = (
    <FiltrosStock
      data={data}
      sucursalActual={sucursalValida}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      soloNegativoActual={soloNegativo}
      ordenActual={orden}
      totalItems={totalFiltrados}
    />
  );

  return (
    <>
      <ExportarStockInstructorModal open={showInstructor} onOpenChange={setShowInstructor} />
      <EditarCoeficientesModal
        open={editarCoefOpen}
        onOpenChange={setEditarCoefOpen}
        proveedores={proveedores}
        onSaved={() => {
          router.refresh();
        }}
      />
      <ClassicFilteredTableLayout
        title="Lista Tienda"
        subtitle="Control Stock"
        actions={actions}
        filters={filters}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaStock
              ref={tableRef}
              data={data}
              sucursalActual={sucursalValida}
              qActual={q}
              marcaActual={marca}
              rubroActual={rubro}
              soloNegativoActual={soloNegativo}
              onFiltradosCountChange={setTotalFiltrados}
            />
          </div>
          {tieneSucursal && data.totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/gestion-productos/tienda/control-stock"
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
    </>
  );
}

