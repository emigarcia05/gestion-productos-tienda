"use client";

import FilterBar, {
  FilterRowSearch,
  FilterRowSelection,
  FilaFiltrosDesplegables,
  FiltroIndividualContainer,
  FILTER_COUNT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  LimpiarFiltrosButton,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  q: string;
  marca: string;
  rubro: string;
  marcasDisponibles: string[];
  rubrosDisponibles: string[];
  total: number;
  loading: boolean;
  onQChange: (v: string) => void;
  onMarcaChange: (v: string) => void;
  onRubroChange: (v: string) => void;
  onBuscar: () => void;
}

export default function FiltrosCompetenciaPrecios({
  q,
  marca,
  rubro,
  marcasDisponibles,
  rubrosDisponibles,
  total,
  loading,
  onQChange,
  onMarcaChange,
  onRubroChange,
  onBuscar,
}: Props) {
  const {
    q: qLocal,
    handleQChange,
    isDebouncing,
    ref: inputRef,
    setQ,
  } = useFiltrosConBusqueda({
    qActual: q,
    debounceMs: 500,
    focusStorageKey: "competencia-precios-busqueda",
    onDebouncedSearch: (value) => {
      onQChange(value);
      onBuscar();
    },
  });

  const hasFilters = !!(q.trim() || marca || rubro);

  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={!!marca}
            onLimpiar={() => {
              onMarcaChange("");
              onBuscar();
            }}
          >
            <Select
              value={marca || "__all__"}
              onValueChange={(v) => {
                onMarcaChange(v === "__all__" ? "" : v);
                onBuscar();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="MARCA" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="__all__">TODAS</SelectItem>
                {marcasDisponibles.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={!!rubro}
            onLimpiar={() => {
              onRubroChange("");
              onBuscar();
            }}
          >
            <Select
              value={rubro || "__all__"}
              onValueChange={(v) => {
                onRubroChange(v === "__all__" ? "" : v);
                onBuscar();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="RUBRO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="__all__">TODOS</SelectItem>
                {rubrosDisponibles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
            {loading ? "CARGANDO..." : `${total} PRODUCTO(S)`}
          </span>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput
            id="competencia-precios-busqueda"
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
            value={qLocal}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton
          visible={hasFilters}
          onClick={() => {
            setQ("");
            onQChange("");
            onMarcaChange("");
            onRubroChange("");
            onBuscar();
          }}
        />
      </div>
    </FilterBar>
  );
}
