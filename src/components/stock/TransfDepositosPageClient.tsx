"use client";

import { useRef, useState } from "react";
import { FileDown } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosTransfDepositos from "@/components/stock/FiltrosTransfDepositos";
import TablaTransfDepositos, {
  type TablaTransfDepositosHandle,
} from "@/components/stock/TablaTransfDepositos";
import ImportarTransferenciasModal, {
  type ItemCantidadTransf,
} from "@/components/stock/ImportarTransferenciasModal";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { Button } from "@/components/ui/button";
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
 * grilla DESCRIPCIÓN / {origen} / → / {destino} / ACCIONES;
 * header **Importar Transferencias** → Excel EGRESO/INGRESO por sucursal.
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
  const tablaRef = useRef<TablaTransfDepositosHandle>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [itemsGrilla, setItemsGrilla] = useState<ItemCantidadTransf[]>([]);

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

  function abrirImportar() {
    setItemsGrilla(tablaRef.current?.getItemsConCantidad() ?? []);
    setImportOpen(true);
  }

  return (
    <ClassicFilteredTableLayout
      title="Stock"
      subtitle="Trans. Depósitos"
      filters={filters}
      actions={
        <Button type="button" className="h-10 px-4" onClick={abrirImportar}>
          <FileDown className="h-4 w-4 shrink-0" aria-hidden />
          Importar Transferencias
        </Button>
      }
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <TablaTransfDepositos
            ref={tablaRef}
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

      <ImportarTransferenciasModal
        open={importOpen}
        onOpenChange={setImportOpen}
        origen={origen}
        destino={destino}
        itemsGrilla={itemsGrilla}
        onEncolado={() => {
          tablaRef.current?.clearCantidades();
          setItemsGrilla([]);
        }}
      />
    </ClassicFilteredTableLayout>
  );
}
