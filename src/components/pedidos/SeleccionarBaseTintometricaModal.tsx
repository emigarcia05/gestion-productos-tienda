"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, {
  type ColumnaModalTabla,
  type ModalTablaQuantityItem,
} from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { buscarBasesTintometricasAction } from "@/actions/tintometrico";
import type { BaseTintometricaRow } from "@/services/tintometrico.service";

const EMPTY: { items: BaseTintometricaRow[]; total: number } = { items: [], total: 0 };

export type BaseTintometricaSeleccion = {
  base: BaseTintometricaRow;
  cantidad: number;
};

function mapItemsToSeleccion(
  items: ModalTablaQuantityItem[],
  rows: BaseTintometricaRow[]
): BaseTintometricaSeleccion[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return items
    .map((item) => {
      const base = byId.get(item.id);
      if (!base) return null;
      return { base, cantidad: item.cantidad };
    })
    .filter((x): x is BaseTintometricaSeleccion => x !== null);
}

export default function SeleccionarBaseTintometricaModal({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSeleccionar: (items: BaseTintometricaSeleccion[]) => void;
}) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetch = useCallback(async (q: string) => {
    setLoading(true);
    setErrorMsg(null);
    const res = await buscarBasesTintometricasAction({ q });
    if (!res.ok) {
      setLoading(false);
      setData(EMPTY);
      setErrorMsg(res.error ?? "Error al buscar.");
      return;
    }
    setData({ items: res.data.items, total: res.data.total });
    setLoading(false);
  }, []);

  const { q, setQ, ref, handleQChange, isDebouncing } = useFiltrosConBusqueda({
    qActual: "",
    debounceMs: 300,
    onDebouncedSearch: (value) => {
      if (!open) return;
      fetch(value);
    },
  });

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setQ("");
      setData(EMPTY);
      setErrorMsg(null);
      fetch("");
    });
  }, [open, fetch, setQ]);

  const columns: ColumnaModalTabla<BaseTintometricaRow>[] = useMemo(
    () => [
      {
        key: "descripcion",
        label: "DESCRIPCIÓN",
        className: "py-2 px-3 text-xs",
        render: (r) => r.descripcionTienda,
      },
    ],
    []
  );

  const filterContent = (
    <div className="flex flex-col gap-2">
      <div className="flex-1 min-w-0">
        <FiltroBusquedaInput
          id="busqueda-base-tintometrica"
          placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
          value={q}
          onChange={handleQChange}
          isDebouncing={isDebouncing || loading}
          inputRef={ref}
        />
      </div>
      {errorMsg && <span className="text-xs text-destructive">{errorMsg}</span>}
    </div>
  );

  const confirmarSeleccion = (items: ModalTablaQuantityItem[]) => {
    const seleccionadas = mapItemsToSeleccion(items, data.items);
    if (seleccionadas.length > 0) {
      onSeleccionar(seleccionadas);
    }
  };

  return (
    <ModalTablaConFiltros<BaseTintometricaRow>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Seleccione Una Base"
      selectionMode="multiQuantity"
      filterContent={filterContent}
      columns={columns}
      rows={data.items}
      count={data.total}
      loading={loading}
      emptyMessage="Sin Resultados"
      getRowId={(r) => r.id}
      confirmQuantityLabel={(n) => `AGREGAR ${n} BASE(S)`}
      onRowDoubleClick={(row) => {
        onSeleccionar([{ base: row, cantidad: 1 }]);
      }}
      onConfirmQuantity={confirmarSeleccion}
    />
  );
}
