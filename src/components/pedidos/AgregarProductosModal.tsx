"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { LimpiarFiltrosButton } from "@/components/FilterBar";
import { buscarProductosTiendaPorDescripcionAction } from "@/actions/productosTienda";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";

const EMPTY: { items: ProductoTiendaRowBusqueda[]; total: number } = { items: [], total: 0 };

export default function AgregarProductosModal({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionar: (row: ProductoTiendaRowBusqueda) => void;
}) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetch = useCallback(
    async (q: string) => {
      setLoading(true);
      setErrorMsg(null);
      const res = await buscarProductosTiendaPorDescripcionAction({ q, take: 100 });
      if (!res.ok) {
        setLoading(false);
        setData(EMPTY);
        setErrorMsg(res.error ?? "Error al buscar productos.");
        return;
      }
      setData({ items: res.data.items, total: res.data.total });
      setLoading(false);
    },
    []
  );

  const { q, setQ, ref, handleQChange, isDebouncing } = useFiltrosConBusqueda({
    qActual: "",
    debounceMs: 300,
    onDebouncedSearch: (value) => {
      if (!open) return;
      void fetch(value);
    },
  });

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setQ("");
      setData(EMPTY);
      setErrorMsg(null);
      void fetch("");
    });
  }, [open, fetch, setQ]);

  const columns: ColumnaModalTabla<ProductoTiendaRowBusqueda>[] = useMemo(
    () => [
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
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 min-w-0">
        <FiltroBusquedaInput
          id="agregar-productos-filtro"
          placeholder="BUSCAR POR DESCRIPCIÓN..."
          value={q}
          onChange={handleQChange}
          isDebouncing={isDebouncing || loading}
          inputRef={ref}
        />
      </div>
      <LimpiarFiltrosButton
        visible={!!q.trim() || !!errorMsg}
        onClick={() => {
          setQ("");
          void fetch("");
        }}
      />
      {errorMsg && <span className="text-xs text-destructive">{errorMsg}</span>}
    </div>
  );

  return (
    <ModalTablaConFiltros<ProductoTiendaRowBusqueda>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Agregar Productos"
      subtitle={undefined}
      filterContent={filterContent}
      columns={columns}
      rows={data.items}
      getRowId={(r) => r.id}
      loading={loading}
      emptyMessage="Sin resultados"
      count={data.total}
      onRowDoubleClick={(row) => {
        onSeleccionar(row);
        onOpenChange(false);
      }}
    />
  );
}

