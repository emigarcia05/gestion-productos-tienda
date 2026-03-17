"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalTablaConFiltros, { type ColumnaModalTabla } from "@/components/shared/ModalTablaConFiltros";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { Button } from "@/components/ui/button";
import { buscarBasesTintometricasAction } from "@/actions/tintometrico";
import type { BaseTintometricaRow } from "@/services/tintometrico.service";

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
        key: "codTienda",
        label: "CÓD. TIENDA",
        className: "py-2 px-3 text-xs w-[10rem]",
        render: (r) => <span className="tabular-nums">{r.codTienda}</span>,
      },
      {
        key: "descripcion",
        label: "DESCRIPCIÓN",
        className: "py-2 px-3 text-xs",
        render: (r) => r.descripcionTienda,
      },
      {
        key: "marca",
        label: "MARCA",
        className: "py-2 px-3 text-xs w-[12rem]",
        render: (r) => r.marca ?? "",
      },
    ],
    []
  );

  const filterContent = (
    <div className="flex items-center gap-2">
      <div className="w-[75%] max-w-2xl min-w-0">
        <FiltroBusquedaInput
          id="busqueda-base-tintometrica"
          placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
          value={q}
          onChange={handleQChange}
          isDebouncing={isDebouncing || loading}
          inputRef={ref}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setQ("");
          fetch("");
        }}
        disabled={!q.trim() && !errorMsg}
      >
        Borrar
      </Button>
      {errorMsg && <span className="text-xs text-destructive">{errorMsg}</span>}
    </div>
  );

  return (
    <ModalTablaConFiltros<BaseTintometricaRow>
      open={open}
      onClose={() => onOpenChange(false)}
      title="Seleccione Una Base"
      filterContent={filterContent}
      columns={columns}
      rows={data.items}
      count={data.total}
      loading={loading}
      emptyMessage="Sin Resultados"
      getRowId={(r) => r.id}
      onRowDoubleClick={onSeleccionar}
    />
  );
}

