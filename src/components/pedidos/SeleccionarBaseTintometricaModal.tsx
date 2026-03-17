"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { buscarBasesTintometricasAction } from "@/actions/tintometrico";
import type { BaseTintometricaRow } from "@/services/tintometrico.service";
import { LimpiarFiltrosButton } from "@/components/FilterBar";

const EMPTY: { items: BaseTintometricaRow[]; total: number } = { items: [], total: 0 };

export default function SeleccionarBaseTintometricaModal({
  open,
  onOpenChange,
  onSeleccionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSeleccionar: (row: BaseTintometricaRow) => void;
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
    setQ("");
    setData(EMPTY);
    setErrorMsg(null);
    fetch("");
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
    <div className="flex items-center gap-3">
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
      <LimpiarFiltrosButton
        visible={!!q.trim() || !!errorMsg}
        onClick={() => {
          setQ("");
          fetch("");
        }}
      />
      {errorMsg && <span className="text-xs text-destructive">{errorMsg}</span>}
    </div>
  );

  return (
    <ModalTablaConFiltros<BaseTintometricaRow>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Seleccione Una Base"
      selectionMode="multi"
      filterContent={filterContent}
      columns={columns}
      rows={data.items}
      count={data.total}
      loading={loading}
      emptyMessage="Sin Resultados"
      getRowId={(r) => r.id}
      onRowDoubleClick={onSeleccionar}
      onConfirm={(ids) => {
        const firstId = ids[0];
        const row = data.items.find((r) => r.id === firstId);
        if (row) onSeleccionar(row);
      }}
    />
  );
}

