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

const FOCUS_KEY = "filtros-px-listas-precios-focus";

interface Props {
  marcas: string[];
  rubros: string[];
  subRubros: string[];
  totalItems: number;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  subRubroActual: string;
}

export default function FiltrosPxListasPrecios({
  marcas,
  rubros,
  subRubros,
  totalItems,
  qActual,
  marcaActual,
  rubroActual,
  subRubroActual,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

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

  const hayFiltros = !!(q || marcaActual || rubroActual || subRubroActual);

  function navigate(updates: {
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
  }) {
    const p = new URLSearchParams();
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const subRubroVal =
      updates.subRubro !== undefined ? updates.subRubro : subRubroActual;
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (subRubroVal) p.set("subRubro", subRubroVal);
    const query = p.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function limpiarFiltros() {
    setQ("");
    router.push(pathname);
  }

  return (
    <FilterBar className="filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <FiltroIndividualContainer
            activo={!!marcaActual}
            onLimpiar={() => navigate({ marca: "" })}
          >
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={marcaActual || "__todas__"}
                onValueChange={(v) =>
                  navigate({ marca: v === "__todas__" ? "" : v })
                }
              >
                <SelectTrigger
                  id="filtro-px-listas-precios-marca"
                  className="select-trigger-filtro"
                >
                  <SelectValue placeholder="MARCA" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="__todas__">TODAS</SelectItem>
                  {marcas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FiltroIndividualContainer>

          <FiltroIndividualContainer
            activo={!!rubroActual}
            onLimpiar={() => navigate({ rubro: "" })}
          >
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={rubroActual || "__todos__"}
                onValueChange={(v) =>
                  navigate({ rubro: v === "__todos__" ? "" : v })
                }
              >
                <SelectTrigger
                  id="filtro-px-listas-precios-rubro"
                  className="select-trigger-filtro"
                >
                  <SelectValue placeholder="RUBRO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="__todos__">TODOS</SelectItem>
                  {rubros.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FiltroIndividualContainer>

          <FiltroIndividualContainer
            activo={!!subRubroActual}
            onLimpiar={() => navigate({ subRubro: "" })}
          >
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={subRubroActual || "__todos__"}
                onValueChange={(v) =>
                  navigate({ subRubro: v === "__todos__" ? "" : v })
                }
              >
                <SelectTrigger
                  id="filtro-px-listas-precios-subrubro"
                  className="select-trigger-filtro"
                >
                  <SelectValue placeholder="SUBRUBRO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="__todos__">TODOS</SelectItem>
                  {subRubros.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FiltroIndividualContainer>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>

      <div className="flex items-center gap-3">
        <FilterRowSearch>
          <FiltroBusquedaInput
            id="filtro-px-listas-precios-busqueda"
            inputRef={inputRef}
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto shrink-0")}>
          {totalItems} PRODUCTO(S)
        </span>
      </div>
    </FilterBar>
  );
}
