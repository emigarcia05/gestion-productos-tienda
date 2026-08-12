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
import type { Sucursal, TransfDepositosData } from "@/actions/stock";

const SUCURSALES: { value: Sucursal; label: string }[] = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
];

interface Props {
  data: TransfDepositosData;
  origenActual: Sucursal | null;
  destinoActual: Sucursal | null;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  totalItems: number;
}

/**
 * Filtros de **Trans. Depósitos**:
 * 1) **SUCURSAL ORIGEN** / **SUCURSAL DESTINO**
 * 2) **MARCA** / **RUBRO** + búsqueda (sin desplegable SUCURSAL)
 */
export default function FiltrosTransfDepositos({
  data,
  origenActual,
  destinoActual,
  qActual,
  marcaActual,
  rubroActual,
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
    debounceMs: 700,
    onDebouncedSearch: (value) => navigate({ q: value }),
  });

  const hayFiltros = !!(
    q ||
    marcaActual ||
    rubroActual ||
    origenActual ||
    destinoActual
  );

  function buildParams(updates: {
    origen?: Sucursal | null;
    destino?: Sucursal | null;
    q?: string;
    marca?: string;
    rubro?: string;
  }): URLSearchParams {
    const p = new URLSearchParams();
    const origen =
      updates.origen !== undefined ? updates.origen : origenActual;
    const destino =
      updates.destino !== undefined ? updates.destino : destinoActual;
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;

    if (origen) p.set("origen", origen);
    if (destino) p.set("destino", destino);
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    return p;
  }

  function navigate(updates: {
    origen?: Sucursal | null;
    destino?: Sucursal | null;
    q?: string;
    marca?: string;
    rubro?: string;
  }) {
    const p = buildParams(updates);
    const query = p.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleOrigen(value: string) {
    if (!value) {
      navigate({
        origen: null,
        marca: "",
        rubro: "",
        q: "",
      });
      setQ("");
      return;
    }
    const nuevoOrigen = value as Sucursal;
    navigate({
      origen: nuevoOrigen,
      /** Origen y destino siempre distintos. */
      destino: destinoActual === nuevoOrigen ? null : destinoActual,
      marca: "",
      rubro: "",
    });
  }

  function handleDestino(value: string) {
    if (!value) {
      navigate({ destino: null });
      return;
    }
    const nuevoDestino = value as Sucursal;
    if (nuevoDestino === origenActual) return;
    navigate({ destino: nuevoDestino });
  }

  function handleMarca(value: string) {
    navigate({ marca: value, rubro: "" });
  }
  function handleRubro(value: string) {
    navigate({ rubro: value });
  }

  function limpiarFiltros() {
    setQ("");
    const p = new URLSearchParams();
    if (origenActual) p.set("origen", origenActual);
    if (destinoActual) p.set("destino", destinoActual);
    const query = p.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const origenSeleccionado = origenActual !== null;

  return (
    <div className="flex flex-col gap-2">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={origenActual !== null}
              onLimpiar={() => handleOrigen("")}
            >
              <Select
                value={origenActual ?? undefined}
                onValueChange={(v) => handleOrigen(v)}
              >
                <SelectTrigger
                  id="filtro-transf-origen"
                  className="input-filtro-unificado"
                >
                  <SelectValue placeholder="SUCURSAL ORIGEN" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {SUCURSALES.filter((s) => s.value !== destinoActual).map(
                    (s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={destinoActual !== null}
              onLimpiar={() => handleDestino("")}
            >
              <Select
                value={destinoActual ?? undefined}
                onValueChange={(v) => handleDestino(v)}
              >
                <SelectTrigger
                  id="filtro-transf-destino"
                  className="input-filtro-unificado"
                >
                  <SelectValue placeholder="SUCURSAL DESTINO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {SUCURSALES.filter((s) => s.value !== origenActual).map(
                    (s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
          </FilaFiltrosDesplegables>
        </FilterRowSelection>
      </FilterBar>

      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(marcaActual)}
              onLimpiar={() => handleMarca("")}
            >
              <Select
                value={marcaActual || undefined}
                onValueChange={(v) => handleMarca(v)}
                disabled={!origenSeleccionado}
              >
                <SelectTrigger
                  id="filtro-transf-marca"
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
                  {data.marcas.map((m) => (
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
                value={rubroActual || undefined}
                onValueChange={(v) => handleRubro(v)}
                disabled={!origenSeleccionado}
              >
                <SelectTrigger
                  id="filtro-transf-rubro"
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
                  {data.rubros.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
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
              id="filtro-transf-busqueda"
              placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
              value={q}
              onChange={handleQChange}
              isDebouncing={isDebouncing}
              inputRef={inputRef}
              disabled={!origenSeleccionado}
            />
          </FilterRowSearch>
          <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
          <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
            {totalItems.toLocaleString("es-AR")} ÍTEM
            {totalItems !== 1 ? "S" : ""}
          </span>
        </div>
      </FilterBar>
    </div>
  );
}
