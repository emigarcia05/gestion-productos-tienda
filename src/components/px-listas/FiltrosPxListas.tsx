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
import { DET_PRECIO_MANUAL } from "@/lib/pxListas";
import {
  OPCIONES_FILTRO_PX_PROMEDIO_PX_LISTAS,
  OPCIONES_ORDEN_MARCACION_PX_LISTAS,
  type FiltroPxPromedioPxListas,
  type OrdenMarcacionPxListas,
} from "@/lib/pxListasFiltros";
import type { CompetidorFiltroPxListas } from "@/services/pxListasPage.service";
import { cn } from "@/lib/utils";

const FOCUS_KEY = "filtros-px-listas-focus";

interface Props {
  marcas: string[];
  rubros: string[];
  competidores: CompetidorFiltroPxListas[];
  totalItems: number;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  detPrecioActual: string;
  filtroPxPromedioActual: FiltroPxPromedioPxListas;
  ordenMarcacionActual: OrdenMarcacionPxListas;
}

export default function FiltrosPxListas({
  marcas,
  rubros,
  competidores,
  totalItems,
  qActual,
  marcaActual,
  rubroActual,
  detPrecioActual,
  filtroPxPromedioActual,
  ordenMarcacionActual,
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

  const hayFiltros = !!(
    q ||
    marcaActual ||
    rubroActual ||
    detPrecioActual ||
    filtroPxPromedioActual ||
    ordenMarcacionActual
  );

  function navigate(updates: {
    q?: string;
    marca?: string;
    rubro?: string;
    detPrecio?: string;
    filtroPxPromedio?: FiltroPxPromedioPxListas;
    ordenMarcacion?: OrdenMarcacionPxListas;
  }) {
    const p = new URLSearchParams();
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const detPrecioVal =
      updates.detPrecio !== undefined ? updates.detPrecio : detPrecioActual;
    const filtroPxPromedioVal =
      updates.filtroPxPromedio !== undefined
        ? updates.filtroPxPromedio
        : filtroPxPromedioActual;
    const ordenVal =
      updates.ordenMarcacion !== undefined
        ? updates.ordenMarcacion
        : ordenMarcacionActual;
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (detPrecioVal) p.set("detPrecio", detPrecioVal);
    if (filtroPxPromedioVal) p.set("filtroPxPromedio", filtroPxPromedioVal);
    if (ordenVal) p.set("ordenMarcacion", ordenVal);
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
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(marcaActual)}
            onLimpiar={() => navigate({ marca: "" })}
          >
            <Select
              value={marcaActual || undefined}
              onValueChange={(v) => navigate({ marca: v, rubro: "" })}
            >
              <SelectTrigger
                id="filtro-px-listas-marca"
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
            onLimpiar={() => navigate({ rubro: "" })}
          >
            <Select
              value={rubroActual || undefined}
              onValueChange={(v) => navigate({ rubro: v })}
            >
              <SelectTrigger
                id="filtro-px-listas-rubro"
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
            activo={Boolean(detPrecioActual)}
            onLimpiar={() => navigate({ detPrecio: "" })}
          >
            <Select
              value={detPrecioActual || undefined}
              onValueChange={(v) => navigate({ detPrecio: v })}
            >
              <SelectTrigger
                id="filtro-px-listas-det-precio"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="DET PRECIO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro max-h-64"
              >
                <SelectItem value={DET_PRECIO_MANUAL}>PX MANUAL</SelectItem>
                {competidores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(filtroPxPromedioActual)}
            onLimpiar={() => navigate({ filtroPxPromedio: "" })}
          >
            <Select
              value={filtroPxPromedioActual || undefined}
              onValueChange={(v) =>
                navigate({ filtroPxPromedio: v as FiltroPxPromedioPxListas })
              }
            >
              <SelectTrigger
                id="filtro-px-listas-px-promedio"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="PX PROMEDIO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {OPCIONES_FILTRO_PX_PROMEDIO_PX_LISTAS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(ordenMarcacionActual)}
            onLimpiar={() => navigate({ ordenMarcacion: "" })}
          >
            <Select
              value={ordenMarcacionActual || undefined}
              onValueChange={(v) =>
                navigate({ ordenMarcacion: v as OrdenMarcacionPxListas })
              }
            >
              <SelectTrigger
                id="filtro-px-listas-marcacion"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="MARCACION" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {OPCIONES_ORDEN_MARCACION_PX_LISTAS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
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
            id="filtro-px-listas-busqueda"
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {totalItems.toLocaleString("es-AR")} ÍTEM{totalItems !== 1 ? "S" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
