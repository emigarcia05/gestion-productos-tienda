"use client";

import { usePathname } from "next/navigation";
import FilterBar, {
  FilterRowSelection,
  FilterRowSearch,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";

const FOCUS_KEY = "buscador-simple-focus";

interface Props {
  qActual: string;
  totalProductos: number;
  extraParams?: Record<string, string>;
}

export default function BuscadorSimple({
  qActual,
  totalProductos,
  extraParams,
}: Props) {
  const pathname = usePathname();

  const {
    q,
    setQ,
    ref: inputRef,
    handleQChange,
    isDebouncing,
    prepareNavigate,
  } = useFiltrosConBusqueda({
    qActual,
    debounceMs: 400,
    focusStorageKey: FOCUS_KEY,
    onDebouncedSearch: (value) => {
      prepareNavigate();
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
      }
      window.location.href = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    },
  });

  const hayFiltros = !!q;

  function limpiarFiltros() {
    setQ("");
    const params = new URLSearchParams();
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
    }
    window.location.href = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return (
    <FilterBar>
      <FilterRowSelection>
        <span className={FILTER_COUNT_CLASS}>
          {totalProductos.toLocaleString()} producto
          {totalProductos !== 1 ? "s" : ""}
        </span>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput
            id="buscador-simple"
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
      </div>
    </FilterBar>
  );
}
