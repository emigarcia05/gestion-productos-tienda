"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import { Input } from "@/components/ui/input";
import { buscarProductosTiendaPorDescripcionAction } from "@/actions/productosTienda";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";
import { toast } from "sonner";

const EMPTY: { items: ProductoTiendaRowBusqueda[]; total: number } = { items: [], total: 0 };

export default function AgregarProductosModal({
  open,
  onOpenChange,
  onAgregar,
  initialBusqueda = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgregar: (row: ProductoTiendaRowBusqueda, cantRecibida: number) => Promise<void> | void;
  initialBusqueda?: string;
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
      setCantRecibida("");
      setQ(initialBusqueda);
      void fetch(initialBusqueda);
    });
  }, [open, fetch, initialBusqueda, setQ]);

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

  const cantRecibidaValida = Math.max(0, Math.floor(Number(cantRecibida) || 0)) > 0;

  const filterContent = (
    <div className="flex w-full flex-col gap-2">
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_10rem] sm:items-center">
        <div className="min-w-0">
          <FiltroBusquedaInput
            id="agregar-productos-filtro"
            placeholder="BUSCAR POR DESCRIPCIÓN..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing || loading}
            inputRef={ref}
          />
        </div>
        <FiltroIndividualContainer
          className="min-w-0 w-full"
          activo={!!cantRecibida.trim()}
          onLimpiar={() => setCantRecibida("")}
        >
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="CANT."
            aria-label="Cant. Recibida (nuevo ítem)"
            value={cantRecibida}
            onChange={(e) => setCantRecibida(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-10 w-full min-w-0 text-center tabular-nums input-filtro-unificado"
          />
        </FiltroIndividualContainer>
      </div>
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
      emptyMessage="SIN RESULTADOS"
      count={data.total}
      selectionMode="singleConfirm"
      showSingleConfirmCheckbox
      confirmSingleLabel="AGREGAR PRODUCTO"
      confirmSingleDisabled={!cantRecibidaValida}
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

