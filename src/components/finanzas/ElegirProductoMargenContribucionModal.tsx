"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, {
  type ColumnaModalTabla,
} from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { buscarProductosMargenContribucionAction } from "@/actions/finAnaMargenContribucion";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";

const EMPTY: { items: ProductoTiendaRowBusqueda[]; total: number } = {
  items: [],
  total: 0,
};

export default function ElegirProductoMargenContribucionModal({
  open,
  onOpenChange,
  onElegir,
  initialBusqueda = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onElegir: (row: ProductoTiendaRowBusqueda) => void | Promise<void>;
  initialBusqueda?: string;
}) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetch = useCallback(async (q: string) => {
    setLoading(true);
    setErrorMsg(null);
    const res = await buscarProductosMargenContribucionAction({ q, take: 100 });
    if (!res.ok) {
      setLoading(false);
      setData(EMPTY);
      setErrorMsg(res.error ?? "Error al buscar productos.");
      return;
    }
    setData({ items: res.data.items, total: res.data.total });
    setLoading(false);
  }, []);

  const { q, setQ, ref, handleQChange, isDebouncing } = useFiltrosConBusqueda({
    qActual: initialBusqueda,
    debounceMs: 300,
    onDebouncedSearch: (value) => {
      if (!open) return;
      void fetch(value);
    },
  });

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setData(EMPTY);
      setErrorMsg(null);
      setQ(initialBusqueda);
      void fetch(initialBusqueda);
    });
  }, [open, fetch, initialBusqueda, setQ]);

  const columns: ColumnaModalTabla<ProductoTiendaRowBusqueda>[] = useMemo(
    () => [
      {
        key: "codTienda",
        label: "COD. TIENDA",
        className: "py-2 px-3 text-xs tabular-nums",
        render: (r) => r.codTienda,
      },
      {
        key: "descripcionTienda",
        label: "DESCRIPCIÓN TIENDA",
        className: "py-2 px-3 text-xs",
        render: (r) => r.descripcionTienda,
      },
    ],
    []
  );

  const filterContent = (
    <div className="flex w-full flex-col gap-2">
      <FiltroBusquedaInput
        id="elegir-producto-mc-filtro"
        placeholder="BUSCAR POR DESCRIPCIÓN..."
        value={q}
        onChange={handleQChange}
        isDebouncing={isDebouncing || loading}
        inputRef={ref}
      />
      {errorMsg && <span className="text-xs text-destructive">{errorMsg}</span>}
    </div>
  );

  return (
    <ModalTablaConFiltros<ProductoTiendaRowBusqueda>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Elegir Producto"
      subtitle="Doble clic en una fila para seleccionar"
      filterContent={filterContent}
      columns={columns}
      rows={data.items}
      getRowId={(r) => r.id}
      loading={loading}
      emptyMessage="SIN RESULTADOS"
      count={data.total}
      tableColumnWidthsPct={[20, 80]}
      onRowDoubleClick={async (row) => {
        await onElegir(row);
        onOpenChange(false);
      }}
    />
  );
}
