"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { LimpiarFiltrosButton } from "@/components/FilterBar";
import { Input } from "@/components/ui/input";
import { buscarProductosTiendaPorDescripcionAction } from "@/actions/productosTienda";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";
import { toast } from "sonner";

const EMPTY: { items: ProductoTiendaRowBusqueda[]; total: number } = { items: [], total: 0 };

export default function AgregarProductosModal({
  open,
  onOpenChange,
  onAgregar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgregar: (row: ProductoTiendaRowBusqueda, cantRecibida: number) => Promise<void> | void;
}) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cantRecibida, setCantRecibida] = useState<string>("");

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
      setCantRecibida("");
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
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
      <div className="flex min-w-0 items-center gap-3">
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
      <Input
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        placeholder="CANT."
        aria-label="Cant. Recibida (nuevo ítem)"
        value={cantRecibida}
        onChange={(e) => setCantRecibida(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="h-10 w-full min-w-0 text-center tabular-nums"
      />
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
      selectionMode="singleConfirm"
      confirmSingleLabel="AGREGAR PRODUCTO"
      onConfirmSingle={async (row) => {
        const cant = Math.max(0, Math.floor(Number(cantRecibida) || 0));
        if (cant <= 0) {
          toast.error("Ingresá una Cant. Recibida mayor a 0.");
          throw new Error("Cantidad inválida");
        }
        await onAgregar(row, cant);
      }}
      onRowDoubleClick={undefined}
    />
  );
}

