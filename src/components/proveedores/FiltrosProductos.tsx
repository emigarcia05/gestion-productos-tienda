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
  SELECT_TRIGGER_FILTER_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";

const FOCUS_KEY = "filtros-proveedores-focus";

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
  totalProductos: number;
  qActual: string;
  proveedorActual: string;
}

export default function FiltrosProductos({
  proveedores,
  totalProductos,
  qActual,
  proveedorActual,
}: Props) {
  const pathname = usePathname();

  function navigate(nuevoQ: string, nuevoProveedor: string) {
    const params = new URLSearchParams();
    if (nuevoQ) params.set("q", nuevoQ);
    if (nuevoProveedor) params.set("proveedor", nuevoProveedor);
    window.location.href = `${pathname}?${params.toString()}`;
  }

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
      navigate(value, proveedorActual);
    },
  });

  function handleProveedor(value: string) {
    navigate(q, value);
  }

  const hayFiltros = !!(proveedorActual || q);

  function limpiarFiltros() {
    setQ("");
    window.location.href = pathname;
  }

  return (
    <FilterBar>
      <FilterRowSelection>
        <FiltroIndividualContainer
          className={FILTER_SELECT_WRAPPER_CLASS}
          activo={Boolean(proveedorActual)}
          onLimpiar={() => handleProveedor("")}
        >
          <Select
            value={proveedorActual || undefined}
            onValueChange={(v) => handleProveedor(v)}
          >
            <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
              <SelectValue placeholder="PROVEEDOR" />
            </SelectTrigger>
            <SelectContent>
              {proveedores.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  [{p.prefijo}] {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FiltroIndividualContainer>
        <span className={FILTER_COUNT_CLASS}>
          {totalProductos.toLocaleString()} PRODUCTO
          {totalProductos !== 1 ? "S" : ""}
        </span>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput
            id="filtro-proveedores-busqueda"
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
