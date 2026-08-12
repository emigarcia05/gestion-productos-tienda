"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosTransfDepositos from "@/components/stock/FiltrosTransfDepositos";
import type { ControlStockData, Sucursal } from "@/actions/stock";

interface Props {
  data: ControlStockData;
  sucursalValida: Sucursal | null;
  origen: Sucursal | null;
  destino: Sucursal | null;
  q: string;
  marca: string;
  rubro: string;
}

/**
 * Pantalla **Stock · Trans. Depósitos**: filtros (sin STOCK/ORDEN) +
 * **SUCURSAL ORIGEN** / **SUCURSAL DESTINO**. Grilla/export en iteraciones siguientes.
 */
export default function TransfDepositosPageClient({
  data,
  sucursalValida,
  origen,
  destino,
  q,
  marca,
  rubro,
}: Props) {
  const filters = (
    <FiltrosTransfDepositos
      data={data}
      sucursalActual={sucursalValida}
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
      <div className="flex flex-1 min-h-0 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground text-center">
          Seleccioná sucursal, origen y destino para armar la transferencia.
        </p>
      </div>
    </ClassicFilteredTableLayout>
  );
}
