"use client";

import { useEffect, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FiltrosReposicion from "@/components/pedidos/FiltrosReposicion";
import TablaReposicion from "@/components/pedidos/TablaReposicion";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import type { ReposicionData, SucursalReposicion } from "@/actions/reposicion";
import { PAGE_SIZE } from "@/lib/pagination";
import EnviarPedidoButton from "@/components/pedidos/EnviarPedidoButton";

interface Props {
  data: ReposicionData;
  sucursalValida: SucursalReposicion | null;
  proveedor: string;
  q: string;
  marca: string;
  rubro: string;
  subRubro: string;
  configurado: "" | "si";
  paginaNum: number;
  paramsPagina: Record<string, string>;
}

export default function ReposicionPageClient({
  data,
  sucursalValida,
  proveedor,
  q,
  marca,
  rubro,
  subRubro,
  configurado,
  paginaNum,
  paramsPagina,
}: Props) {
  const [totalFiltrados, setTotalFiltrados] = useState<number>(data.items.length);
  const [proveedorActual, setProveedorActual] = useState<string>(proveedor);
  const tieneSucursal = sucursalValida !== null;

  useEffect(() => {
    if (sucursalValida === null) setProveedorActual("");
    else setProveedorActual(proveedor);
  }, [proveedor, sucursalValida]);

  const filters = (
    <FiltrosReposicion
      data={data}
      sucursalActual={sucursalValida}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
      configuradoActual={configurado}
      totalItems={totalFiltrados}
      proveedorActual={proveedorActual}
      onProveedorChange={setProveedorActual}
    />
  );

  return (
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Pedido Reposición"
      actions={
        <EnviarPedidoButton
          proveedorId={proveedorActual}
          sucursal={sucursalValida ?? ""}
          tipos={["REPOSICION"]}
        />
      }
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <TablaReposicion
            data={data}
            sucursalActual={sucursalValida}
            onFiltradosCountChange={setTotalFiltrados}
          />
        </div>
        {tieneSucursal && data.totalPaginas > 1 && (
          <div className="flex justify-end pt-2 shrink-0">
            <PaginacionTabla
              basePath="/pedidos/reposicion"
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
