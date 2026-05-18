"use client";

import { useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosReposicion from "@/components/pedidos/FiltrosReposicion";
import TablaReposicion from "@/components/pedidos/TablaReposicion";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import GenerarPedidoToolbarButton from "@/components/pedidos/GenerarPedidoToolbarButton";
import type { ReposicionData, SucursalReposicion } from "@/actions/reposicion";
import { PAGE_SIZE } from "@/lib/pagination";
import PosicionIvaComparacionAutoRefresh from "@/components/pedidos/PosicionIvaComparacionAutoRefresh";

interface Props {
  data: ReposicionData;
  proveedores: { id: string; nombre: string; prefijo: string }[];
  sucursales: { value: SucursalReposicion; label: string }[];
  sucursalValida: SucursalReposicion | null;
  proveedor: string;
  q: string;
  marca: string;
  rubro: string;
  configurado: "" | "si";
  paginaNum: number;
  paramsPagina: Record<string, string>;
  ivaComparacionRevisionToken: string;
}

export default function ReposicionPageClient({
  data,
  proveedores,
  sucursales,
  sucursalValida,
  proveedor,
  q,
  marca,
  rubro,
  configurado,
  paginaNum,
  paramsPagina,
  ivaComparacionRevisionToken,
}: Props) {
  const [totalFiltrados, setTotalFiltrados] = useState<number>(data.items.length);
  const tieneSucursal = sucursalValida !== null;
  const proveedorActual = proveedor;

  const filters = (
    <FiltrosReposicion
      data={data}
      sucursalActual={sucursalValida}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      configuradoActual={configurado}
      totalItems={totalFiltrados}
      proveedorActual={proveedorActual}
      sucursales={sucursales}
      onProveedorChange={() => {}}
    />
  );

  return (
    <>
      <PosicionIvaComparacionAutoRefresh initialToken={ivaComparacionRevisionToken} />
      <ClassicFilteredTableLayout
        title="Pedido Mercadería"
        subtitle="Pedido Reposición"
      actions={
        <GenerarPedidoToolbarButton
          proveedores={proveedores}
          defaultSucursal={sucursalValida ?? ""}
          defaultProveedor={proveedorActual}
          defaultTipos={[]}
          modulo="reposicion"
          triggerLabel="Generar Pedido"
        />
      }
      filters={filters}
    >
      <div className="flex h-full min-h-0 flex-col gap-0">
        <TablaReposicion
          data={data}
          sucursalActual={sucursalValida}
          onFiltradosCountChange={setTotalFiltrados}
        />
        {tieneSucursal && data.totalPaginas > 1 && (
          <div className="flex justify-end pt-2 shrink-0">
            <PaginacionTabla
              basePath="/gestion-productos/pedidos/reposicion"
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
