"use client";

import { useEffect, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GuardarCambiosPedidoButton from "@/components/pedidos/GuardarCambiosPedidoButton";
import TablaPedidoUrgente from "@/components/pedidos/TablaPedidoUrgente";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ProductoPedidoUrgente } from "@/components/pedidos/TablaPedidoUrgente";
import CantidadPedidoUrgenteModal, {
  type ProductoPedidoUrgenteModal,
} from "@/components/pedidos/CantidadPedidoUrgenteModal";
import { toast } from "sonner";
import { upsertPedidoUrgenteMercaderiaItemAction } from "@/actions/pedidos";

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

const MENSAJE_SIN_FILTROS =
  "Configurá Sucursal y al menos un filtro más (Proveedor, Pedido o Descripción) para ver los productos.";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoPedidoUrgenteModal | null>(null);

  useEffect(() => {
    if (productos.length === 0) return;
    setCantPorId((prev) => {
      const next = { ...prev };
      for (const p of productos) {
        if (next[p.id] !== undefined) continue;
        const cant = Math.max(0, Math.floor(Number(p.cantPedidaUrgente) || 0));
        next[p.id] = cant > 0 ? String(cant) : "";
      }
      return next;
    });
  }, [productos]);

  const actions =
    sucursalValida && !sinFiltros ? (
      <GuardarCambiosPedidoButton sucursal={sucursalValida} cantPorId={cantPorId} />
    ) : undefined;

  function abrirModalCantidad(prod: ProductoPedidoUrgente) {
    setProductoSeleccionado({
      id: prod.id,
      descripcion: prod.descripcion,
    });
    setModalOpen(true);
  }

  async function borrarCantidad(prod: ProductoPedidoUrgente) {
    if (!sucursalValida) {
      toast.error("Seleccioná una sucursal para guardar.");
      return;
    }
    const id = prod.id;
    const prevValue = cantPorId[id];
    setCantPorId((prev) => ({ ...prev, [id]: "" }));

    const res = await upsertPedidoUrgenteMercaderiaItemAction({
      sucursal: sucursalValida,
      listaPrecioProveedorId: id,
      cant: 0,
    });
    if (!res.ok) {
      setCantPorId((prev) => ({ ...prev, [id]: prevValue ?? "" }));
      toast.error(res.error ?? "Error al borrar.");
      return;
    }
    toast.success("Ítem borrado.");
  }

  async function confirmarCantidad(cantidad: number) {
    if (!productoSeleccionado) return;
    if (!sucursalValida) {
      toast.error("Seleccioná una sucursal para guardar.");
      return;
    }
    const id = productoSeleccionado.id;
    const prevValue = cantPorId[id];
    setCantPorId((prev) => ({ ...prev, [id]: cantidad > 0 ? String(cantidad) : "" }));

    const res = await upsertPedidoUrgenteMercaderiaItemAction({
      sucursal: sucursalValida,
      listaPrecioProveedorId: id,
      cant: cantidad,
    });
    if (!res.ok) {
      setCantPorId((prev) => ({ ...prev, [id]: prevValue ?? "" }));
      toast.error(res.error ?? "Error al guardar.");
      return;
    }
    toast.success("Ítem guardado.");
  }

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
            <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar flex-1 min-h-0">
              <TablaPedidoUrgente
                productos={productos}
                sucursal={sucursalValida}
                sinFiltros={sinFiltros}
                mensajeSinSucursal={MENSAJE_SIN_FILTROS}
                pedidoFilter={pedidoValida}
                cantPorId={cantPorId}
                setCantPorId={setCantPorId}
                onRowDoubleClick={abrirModalCantidad}
                onRowDeleteClick={borrarCantidad}
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
        <CantidadPedidoUrgenteModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          producto={productoSeleccionado}
          onConfirmar={confirmarCantidad}
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}
