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
  CONFIGURADO_OPCIONES,
  DIF_PROMEDIO_OPCIONES,
} from "@/lib/competenciaPreciosFiltros";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
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
  difPromedio: string;
  provCaroCompetenciaId: string;
  provBaratoCompetenciaId: string;
  configurado: string;
  competencias: CompetenciaParaCliente[];
  total: number;
  loading: boolean;
  onQChange: (v: string) => void;
  onDifPromedioChange: (v: string) => void;
  onProvCaroCompetenciaIdChange: (v: string) => void;
  onProvBaratoCompetenciaIdChange: (v: string) => void;
  onConfiguradoChange: (v: string) => void;
  onBuscar: () => void;
}

export default function FiltrosCompetenciaPrecios({
  q,
  difPromedio,
  provCaroCompetenciaId,
  provBaratoCompetenciaId,
  configurado,
  competencias,
  total,
  loading,
  onQChange,
  onDifPromedioChange,
  onProvCaroCompetenciaIdChange,
  onProvBaratoCompetenciaIdChange,
  onConfiguradoChange,
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

  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={!!difPromedio}
            onLimpiar={() => {
              onDifPromedioChange("");
              onBuscar();
            }}
          >
            <Select
              value={difPromedio || "__all__"}
              onValueChange={(v) => {
                onDifPromedioChange(v === "__all__" ? "" : v);
                onBuscar();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="DIF. PROMEDIO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="__all__">DIF. PROMEDIO</SelectItem>
                {DIF_PROMEDIO_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={!!provCaroCompetenciaId}
            onLimpiar={() => {
              onProvCaroCompetenciaIdChange("");
              onBuscar();
            }}
          >
            <Select
              value={provCaroCompetenciaId || "__all__"}
              onValueChange={(v) => {
                onProvCaroCompetenciaIdChange(v === "__all__" ? "" : v);
                onBuscar();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="PROV. CARO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="__all__">PROV. CARO</SelectItem>
                {competencias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={!!provBaratoCompetenciaId}
            onLimpiar={() => {
              onProvBaratoCompetenciaIdChange("");
              onBuscar();
            }}
          >
            <Select
              value={provBaratoCompetenciaId || "__all__"}
              onValueChange={(v) => {
                onProvBaratoCompetenciaIdChange(v === "__all__" ? "" : v);
                onBuscar();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="PROV. BARATO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="__all__">PROV. BARATO</SelectItem>
                {competencias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={!!configurado}
            onLimpiar={() => {
              onConfiguradoChange("");
              onBuscar();
            }}
          >
            <Select
              value={configurado || "__all__"}
              onValueChange={(v) => {
                onConfiguradoChange(v === "__all__" ? "" : v);
                onBuscar();
              }}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="CONFIGURADO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="__all__">CONFIGURADO</SelectItem>
                {CONFIGURADO_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
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
          onClick={() => {
            setQ("");
            onQChange("");
            onDifPromedioChange("");
            onProvCaroCompetenciaIdChange("");
            onProvBaratoCompetenciaIdChange("");
            onConfiguradoChange("");
            onBuscar();
          }}
        />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {loading ? "CARGANDO..." : `${total.toLocaleString("es-AR")} PRODUCTO(S)`}
        </span>
      </div>
    </FilterBar>
  );
}
