"use client";

import { useEffect, useState, startTransition } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FilterBar, {
  FilaFiltrosDesplegables,
  FilterRowSelection,
  FiltroIndividualContainer,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getProductosPedidoAFabricaAction } from "@/actions/pedidoAFabrica";
import type { ProductoPedidoAFabricaItem } from "@/services/pedidoAFabrica.service";
import TablaPedidoAFabrica from "@/components/pedido-a-fabrica/TablaPedidoAFabrica";

export type ProveedorFabricaOption = {
  id: string;
  nombre: string;
  prefijo: string;
};

interface Props {
  proveedoresFabrica: ProveedorFabricaOption[];
}

/**
 * Módulo **Pedido A Fábrica** (pilar sidebar Administración).
 * Primer control: **PROVEEDOR** (solo `es_fabrica = true`).
 * Al seleccionar: tabla con **DESCRIPCIÓN** de productos de ese proveedor.
 */
export default function PedidoAFabricaPageClient({
  proveedoresFabrica,
}: Props) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [pagina, setPagina] = useState(1);
  const [productos, setProductos] = useState<ProductoPedidoAFabricaItem[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [loading, setLoading] = useState(false);

  const proveedorActivo = proveedorId !== "";

  function handleProveedorChange(value: string) {
    setProveedorId(value);
    setPagina(1);
  }

  function handleLimpiarProveedor() {
    setProveedorId("");
    setPagina(1);
    setProductos([]);
    setTotalPaginas(0);
  }

  useEffect(() => {
    if (!proveedorId) {
      queueMicrotask(() => {
        setProductos([]);
        setTotalPaginas(0);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setLoading(true));

    startTransition(() => {
      void (async () => {
        const res = await getProductosPedidoAFabricaAction({
          proveedorId,
          pagina,
        });
        if (cancelled) return;
        setProductos(res.productos);
        setTotalPaginas(res.totalPaginas);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [proveedorId, pagina]);

  return (
    <ClassicFilteredTableLayout
      title="PEDIDO A FÁBRICA"
      subtitle="Pedido A Fábrica"
      contentWidth="full"
      filters={
        <FilterBar className="filtros-contenedor-tienda bg-card">
          <FilterRowSelection>
            <FilaFiltrosDesplegables columnas={5}>
              <FiltroIndividualContainer
                activo={proveedorActivo}
                onLimpiar={handleLimpiarProveedor}
              >
                <Select
                  value={proveedorId || undefined}
                  onValueChange={handleProveedorChange}
                >
                  <SelectTrigger
                    className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                    aria-label="PROVEEDOR"
                  >
                    <SelectValue placeholder="PROVEEDOR" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    {proveedoresFabrica.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.prefijo
                          ? `[${p.prefijo}] ${p.nombre}`.toLocaleUpperCase("es")
                          : p.nombre.toLocaleUpperCase("es")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
            </FilaFiltrosDesplegables>
          </FilterRowSelection>
        </FilterBar>
      }
    >
      {proveedorActivo ? (
        <TablaPedidoAFabrica
          productos={productos}
          pagina={pagina}
          totalPaginas={totalPaginas}
          onPaginaChange={setPagina}
          loading={loading}
          emptyMessage="Este proveedor no tiene productos en la lista de precios."
        />
      ) : (
        <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Seleccioná un proveedor de fábrica para ver sus productos.
          </p>
        </div>
      )}
    </ClassicFilteredTableLayout>
  );
}
