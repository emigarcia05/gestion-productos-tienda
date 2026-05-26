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
import { cn } from "@/lib/utils";

const FOCUS_KEY = "filtros-tienda-focus";

interface Props {
  marcas: string[];
  rubros: string[];
  subRubros: string[];
  proveedores: { id: string; nombre: string; prefijo: string }[];
  totalItems: number;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  subRubroActual: string;
  proveedorActual: string;
  vinculadoActual: string;
}

export default function FiltrosTienda({
  marcas,
  rubros,
  subRubros,
  proveedores,
  totalItems,
  qActual,
  marcaActual,
  rubroActual,
  subRubroActual,
  proveedorActual,
  vinculadoActual,
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

  const hayFiltros = !!(
    q ||
    marcaActual ||
    rubroActual ||
    subRubroActual ||
    proveedorActual ||
    vinculadoActual
  );

  function navigate(updates: {
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
    proveedor?: string;
    vinculado?: string;
  }) {
    const p = new URLSearchParams();
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const subRubroVal =
      updates.subRubro !== undefined ? updates.subRubro : subRubroActual;
    const proveedorVal =
      updates.proveedor !== undefined ? updates.proveedor : proveedorActual;
    const vincVal =
      updates.vinculado !== undefined ? updates.vinculado : vinculadoActual;
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (subRubroVal) p.set("subRubro", subRubroVal);
    if (proveedorVal) p.set("proveedor", proveedorVal);
    if (vincVal) p.set("vinculado", vincVal);
    window.location.href = `${pathname}?${p.toString()}`;
  }

  function handleMarca(value: string) {
    navigate({ marca: value, rubro: "", subRubro: "" });
  }
  function handleRubro(value: string) {
    navigate({ rubro: value, subRubro: "" });
  }
  function handleSubRubro(value: string) {
    navigate({ subRubro: value });
  }
  function handleProveedor(value: string) {
    navigate({ proveedor: value });
  }
  function handleVinculado(value: string) {
    navigate({ vinculado: value });
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
              <SelectTrigger
                id="filtro-tienda-marca"
                className="input-filtro-unificado"
              >
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
              <SelectTrigger
                id="filtro-tienda-rubro"
                className="input-filtro-unificado"
              >
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
            activo={Boolean(subRubroActual)}
            onLimpiar={() => handleSubRubro("")}
          >
            <Select
              value={subRubroActual || "none"}
              onValueChange={(v) => handleSubRubro(v === "none" ? "" : v)}
            >
              <SelectTrigger
                id="filtro-tienda-subrubro"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="SUB-RUBRO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SUB-RUBRO</SelectItem>
                {subRubros.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(proveedorActual)}
            onLimpiar={() => handleProveedor("")}
          >
            <Select
              value={proveedorActual || "none"}
              onValueChange={(v) => handleProveedor(v === "none" ? "" : v)}
            >
              <SelectTrigger
                id="filtro-tienda-proveedor"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="PROV. VINC." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">PROV. VINC.</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prefijo ? `[${p.prefijo}] ` : ""}
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(vinculadoActual)}
            onLimpiar={() => handleVinculado("")}
          >
            <Select
              value={vinculadoActual || "none"}
              onValueChange={(v) => handleVinculado(v === "none" ? "" : v)}
            >
              <SelectTrigger
                id="filtro-tienda-vinculado"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="VINCULADO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">VINCULADO</SelectItem>
                <SelectItem value="no">NO</SelectItem>
                <SelectItem value="si">SI</SelectItem>
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
          <FiltroBusquedaInput
            id="filtro-tienda-busqueda"
            placeholder="BUSCAR POR DESCRIPCIÓN, CÓDIGO O MARCA..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {totalItems.toLocaleString()} ITEM{totalItems !== 1 ? "S" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
