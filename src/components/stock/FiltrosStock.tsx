"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ControlStockData, ItemStock, Sucursal } from "@/actions/stock";

const SUCURSALES: { value: Sucursal; label: string }[] = [
  { value: "guaymallen", label: "Guaymallén" },
  { value: "maipu", label: "Maipú" },
];

function distinctStrings(
  items: ItemStock[],
  getVal: (i: ItemStock) => string | null
): string[] {
  const set = new Set<string>();
  for (const i of items) {
    const v = getVal(i);
    if (v != null && v.trim() !== "") set.add(v);
  }
  return Array.from(set).sort();
}

interface Props {
  data: ControlStockData;
  sucursalActual: Sucursal | null;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  subRubroActual: string;
  soloNegativoActual: boolean;
  totalItems: number;
}

export default function FiltrosStock({
  data,
  sucursalActual,
  qActual,
  marcaActual,
  rubroActual,
  subRubroActual,
  soloNegativoActual,
  totalItems,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState(qActual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQ(qActual);
  }, [qActual]);

  const itemsPorMarca =
    !marcaActual ? data.items : data.items.filter((i) => i.marca === marcaActual);
  const itemsPorMarcaRubro =
    !rubroActual ? itemsPorMarca : itemsPorMarca.filter((i) => i.rubro === rubroActual);
  const opcionesRubros = distinctStrings(itemsPorMarca, (i) => i.rubro);
  const opcionesSubRubros = distinctStrings(itemsPorMarcaRubro, (i) => i.subRubro);

  const hayFiltros = !!(
    q ||
    marcaActual ||
    rubroActual ||
    subRubroActual ||
    soloNegativoActual
  );

  function buildParams(updates: {
    sucursal?: Sucursal | null;
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
    soloNegativo?: boolean;
  }): URLSearchParams {
    const p = new URLSearchParams();
    const sucursal =
      updates.sucursal !== undefined ? updates.sucursal : sucursalActual;
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const subRubroVal =
      updates.subRubro !== undefined ? updates.subRubro : subRubroActual;
    const soloVal =
      updates.soloNegativo !== undefined ? updates.soloNegativo : soloNegativoActual;

    if (sucursal) p.set("sucursal", sucursal);
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (subRubroVal) p.set("subRubro", subRubroVal);
    if (soloVal) p.set("soloNegativo", "true");
    return p;
  }

  function navigate(updates: {
    sucursal?: Sucursal | null;
    q?: string;
    marca?: string;
    rubro?: string;
    subRubro?: string;
    soloNegativo?: boolean;
  }) {
    const p = buildParams(updates);
    const query = p.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({ q: value });
    }, 400);
  }

  function handleSucursal(value: string) {
    if (!value) {
      router.push(pathname);
      return;
    }
    navigate({
      sucursal: value as Sucursal,
      marca: "",
      rubro: "",
      subRubro: "",
    });
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
  function handleSoloNegativo(value: string) {
    navigate({ soloNegativo: value === "negativo" });
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
                id="filtro-stock-sucursal"
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
                id="filtro-stock-marca"
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
                id="filtro-stock-rubro"
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
                {opcionesRubros.map((r) => (
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
                id="filtro-stock-subrubro"
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
                {opcionesSubRubros.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={soloNegativoActual ? "negativo" : "todos"}
              onValueChange={handleSoloNegativo}
              disabled={!sucursalSeleccionada}
            >
              <SelectTrigger
                id="filtro-stock-estado"
                className="input-filtro-unificado"
              >
                <SelectValue placeholder="STOCK" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">STOCK</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="negativo">Stock negativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
            <Input
              ref={inputRef}
              id="filtro-stock-busqueda"
              value={q}
              onChange={(e) => handleQ(e.target.value)}
              placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
              className="input-filtro-unificado pl-9 pr-8"
              disabled={!sucursalSeleccionada}
            />
            {q && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={`${FILTER_COUNT_CLASS} ml-auto`}>
          {totalItems.toLocaleString("es-AR")} ítem
          {totalItems !== 1 ? "s" : ""}
        </span>
      </div>
    </FilterBar>
  );
}

