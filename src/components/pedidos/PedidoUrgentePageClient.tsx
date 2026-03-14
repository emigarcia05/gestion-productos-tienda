"use client";

import { useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GuardarCambiosPedidoButton from "@/components/pedidos/GuardarCambiosPedidoButton";
import TablaPedidoUrgente from "@/components/pedidos/TablaPedidoUrgente";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ProductoPedidoUrgente } from "@/components/pedidos/TablaPedidoUrgente";

interface Props {
  filters: React.ReactNode;
  productos: ProductoPedidoUrgente[];
  sucursalValida: "" | "guaymallen" | "maipu";
  /** True cuando faltan uno o más de los 3 filtros obligatorios (Sucursal, Proveedor, Pedido). */
  sinFiltros: boolean;
  pedidoValida: "si" | "no" | "";
  total: number;
  totalPaginas: number;
  paginaNum: number;
  proveedor: string;
  q: string;
}

const MENSAJE_SIN_TRES_FILTROS =
  "Configurá los 3 filtros (Sucursal, Proveedor y Pedido) para ver los productos.";

export default function PedidoUrgentePageClient({
  filters,
  productos,
  sucursalValida,
  sinFiltros,
  pedidoValida,
  total,
  totalPaginas,
  paginaNum,
  proveedor,
  q,
}: Props) {
  const [cantPorId, setCantPorId] = useState<Record<string, string>>({});

  const actions =
    sucursalValida && !sinFiltros ? (
      <GuardarCambiosPedidoButton sucursal={sucursalValida} cantPorId={cantPorId} />
    ) : undefined;

  return (
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Pedido Urgente"
      actions={actions}
      filters={filters}
    >
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <Card className="min-h-0 flex flex-col rounded-xl border-border bg-card overflow-hidden gap-0 py-0 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <CardContent className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
            <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0 overflow-auto">
              <TablaPedidoUrgente
                productos={productos}
                sucursal={sucursalValida}
                sinFiltros={sinFiltros}
                mensajeSinSucursal={MENSAJE_SIN_TRES_FILTROS}
                pedidoFilter={pedidoValida}
                cantPorId={cantPorId}
                setCantPorId={setCantPorId}
              />
            </div>
            {!sinFiltros && sucursalValida && (
              <div className="flex items-center justify-between gap-2 py-1.5 px-1 border-t bg-gris rounded-b-lg shrink-0">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {total === 0
                    ? "Mostrando 0 de 0"
                    : `Mostrando ${productos.length.toLocaleString()} de ${total.toLocaleString()}`}
                </span>
                {totalPaginas > 1 && (
                  <PaginacionTabla
                    basePath="/pedidos/urgente"
                    params={{
                      sucursal: sucursalValida,
                      proveedor,
                      q,
                      pedido: pedidoValida,
                    }}
                    paginaActual={paginaNum}
                    totalPaginas={totalPaginas}
                    total={total}
                    pageSize={PAGE_SIZE}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClassicFilteredTableLayout>
  );
}
