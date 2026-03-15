"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
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
import type { ReposicionData, SucursalReposicion } from "@/actions/reposicion";

const SUCURSALES: { value: SucursalReposicion; label: string }[] = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
];

interface Props {
  data: ReposicionData;
  sucursalActual: SucursalReposicion | null;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  subRubroActual: string;
  totalItems: number;
}

export default function FiltrosReposicion({
  data,
  sucursalActual,
  qActual,
  marcaActual,
  rubroActual,
  subRubroActual,
  totalItems,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    q,
    setQ,
    ref: inputRef,
    handleQChange,
    isDebouncing,
  } = useFiltrosConBusqueda({
    qActual,
    debounceMs: 400,
    onDebouncedSearch: (value) => navigate({ q: value }),
  });

  const hayFiltros = !!(
    q ||
    marcaActual ||
    rubroActual ||
    subRubroActual
  );

  function buildParams(updates: {
    sucursal?: SucursalReposicion | null;
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
    pagina?: string;
  }): URLSearchParams {
    const p = new URLSearchParams();
    const sucursal =
      updates.sucursal !== undefined ? updates.sucursal : sucursalActual;
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const subRubroVal =
      updates.subRubro !== undefined ? updates.subRubro : subRubroActual;

    if (sucursal) p.set("sucursal", sucursal);
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (subRubroVal) p.set("subRubro", subRubroVal);
    if (updates.pagina) p.set("pagina", updates.pagina);
    return p;
  }

  function navigate(updates: {
    sucursal?: SucursalReposicion | null;
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
    pagina?: string;
  }) {
    const p = buildParams(updates);
    const query = p.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSucursal(value: string) {
    if (!value) {
      router.push(pathname);
      return;
    }
    navigate({
      sucursal: value as SucursalReposicion,
      marca: "",
      rubro: "",
      subRubro: "",
      pagina: "1",
    });
  }

  function handleMarca(value: string) {
    navigate({ marca: value, rubro: "", subRubro: "", pagina: "1" });
  }
  function handleRubro(value: string) {
    navigate({ rubro: value, subRubro: "", pagina: "1" });
  }
  function handleSubRubro(value: string) {
    navigate({ subRubro: value, pagina: "1" });
  }

  function limpiarFiltros() {
    setQ("");
    if (sucursalActual) {
      router.push(`${pathname}?sucursal=${sucursalActual}`);
    } else {
      router.push(pathname);
    }
  }

  const sucursalValue = sucursalActual ?? "none";
  const sucursalSeleccionada = sucursalActual !== null;

  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={sucursalValue}
              onValueChange={(v) => handleSucursal(v === "none" ? "" : v)}
            >
              <SelectTrigger
                id="filtro-reposicion-sucursal"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="SUCURSAL" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SUCURSAL</SelectItem>
                {SUCURSALES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={marcaActual || "none"}
              onValueChange={(v) => handleMarca(v === "none" ? "" : v)}
              disabled={!sucursalSeleccionada}
            >
              <SelectTrigger
                id="filtro-reposicion-marca"
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
                {data.marcas.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={rubroActual || "none"}
              onValueChange={(v) => handleRubro(v === "none" ? "" : v)}
              disabled={!sucursalSeleccionada}
            >
              <SelectTrigger
                id="filtro-reposicion-rubro"
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
                {data.rubros.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={subRubroActual || "none"}
              onValueChange={(v) => handleSubRubro(v === "none" ? "" : v)}
              disabled={!sucursalSeleccionada}
            >
              <SelectTrigger
                id="filtro-reposicion-subrubro"
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
                {data.subRubros.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
          <FiltroBusquedaInput
            id="filtro-reposicion-busqueda"
            placeholder="DESCRIPCIÓN"
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
            disabled={!sucursalSeleccionada}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {totalItems.toLocaleString("es-AR")} ÍTEM
          {totalItems !== 1 ? "S" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
