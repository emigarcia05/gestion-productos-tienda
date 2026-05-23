"use client";

import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FiltroIndividualContainer,
  FilterRowSelection,
  FilterRowSearch,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import {
  CX_PROD_SELECCION_PROM,
  VINC_COSTO_MAS,
  VINC_COSTO_SIN,
  VINC_COSTO_UNO,
  type ProveedorCxPxFiltro,
} from "@/lib/cxPxTienda";
import { cn } from "@/lib/utils";

const FOCUS_KEY = "filtros-cx-px-tienda-focus";

interface Props {
  marcas: string[];
  rubros: string[];
  proveedores: ProveedorCxPxFiltro[];
  totalItems: number;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  vincCostoActual: string;
  costoProvActual: string;
}

export default function FiltrosCxPxTienda({
  marcas,
  rubros,
  proveedores,
  totalItems,
  qActual,
  marcaActual,
  rubroActual,
  vincCostoActual,
  costoProvActual,
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
    debounceMs: 700,
    focusStorageKey: FOCUS_KEY,
    onDebouncedSearch: (value) => {
      prepareNavigate();
      navigate({ q: value });
    },
  });

  const hayFiltros = !!(q || marcaActual || rubroActual || vincCostoActual || costoProvActual);

  function navigate(updates: {
    q?: string;
    marca?: string;
    rubro?: string;
    vincCosto?: string;
    costoProv?: string;
  }) {
    const p = new URLSearchParams();
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const vincCostoVal =
      updates.vincCosto !== undefined ? updates.vincCosto : vincCostoActual;
    const costoProvVal =
      updates.costoProv !== undefined ? updates.costoProv : costoProvActual;
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (vincCostoVal) p.set("vincCosto", vincCostoVal);
    if (costoProvVal) p.set("costoProv", costoProvVal);
    window.location.href = `${pathname}?${p.toString()}`;
  }

  function handleMarca(value: string) {
    navigate({ marca: value, rubro: "" });
  }
  function handleRubro(value: string) {
    navigate({ rubro: value });
  }
  function handleVincCosto(value: string) {
    navigate({ vincCosto: value });
  }
  function handleCostoProv(value: string) {
    navigate({ costoProv: value });
  }

  function limpiarFiltros() {
    setQ("");
    window.location.href = pathname;
  }

  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(marcaActual)}
            onLimpiar={() => handleMarca("")}
          >
            <Select
              value={marcaActual || "none"}
              onValueChange={(v) => handleMarca(v === "none" ? "" : v)}
            >
              <SelectTrigger id="filtro-cx-px-marca" className="input-filtro-unificado">
                <SelectValue placeholder="MARCA" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">MARCA</SelectItem>
                {marcas.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(rubroActual)}
            onLimpiar={() => handleRubro("")}
          >
            <Select
              value={rubroActual || "none"}
              onValueChange={(v) => handleRubro(v === "none" ? "" : v)}
            >
              <SelectTrigger id="filtro-cx-px-rubro" className="input-filtro-unificado">
                <SelectValue placeholder="RUBRO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">RUBRO</SelectItem>
                {rubros.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(vincCostoActual)}
            onLimpiar={() => handleVincCosto("")}
          >
            <Select
              value={vincCostoActual || "none"}
              onValueChange={(v) => handleVincCosto(v === "none" ? "" : v)}
            >
              <SelectTrigger id="filtro-cx-px-cx-vinc" className="input-filtro-unificado">
                <SelectValue placeholder="CX. VINC." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">CX. VINC.</SelectItem>
                <SelectItem value={VINC_COSTO_SIN}>SIN PROV.</SelectItem>
                <SelectItem value={VINC_COSTO_UNO}>UN PROV.</SelectItem>
                <SelectItem value={VINC_COSTO_MAS}>MAS DE 1 PROV.</SelectItem>
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(costoProvActual)}
            onLimpiar={() => handleCostoProv("")}
          >
            <Select
              value={costoProvActual || "none"}
              onValueChange={(v) => handleCostoProv(v === "none" ? "" : v)}
            >
              <SelectTrigger id="filtro-cx-px-cx-prov" className="input-filtro-unificado">
                <SelectValue placeholder="CX. PROV." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">CX. PROV.</SelectItem>
                <SelectItem value={CX_PROD_SELECCION_PROM}>CX. PROM.</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prefijo ? `[${p.prefijo}] ` : ""}
                    {p.nombre}
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
            id="filtro-cx-px-descripcion"
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {totalItems.toLocaleString()} ÍTEM{totalItems !== 1 ? "S" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
