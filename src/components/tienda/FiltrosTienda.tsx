"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
import FilterBar, { FilterRowSelection, FilterRowSearch, FILTER_SELECT_WRAPPER_CLASS, FILTER_COUNT_CLASS, LimpiarFiltrosButton } from "@/components/FilterBar";

const FOCUS_KEY = "filtros-tienda-focus";

interface Props {
  marcas: string[];
  rubros: string[];
  subRubros: string[];
  totalItems: number;
  qActual: string;
  marcaActual: string;
  rubroActual: string;
  subRubroActual: string;
  habilitadoActual: string;
  mejorPrecioActual: string;
}

export default function FiltrosTienda({
  marcas, rubros, subRubros, totalItems,
  qActual, marcaActual, rubroActual, subRubroActual, habilitadoActual, mejorPrecioActual,
}: Props) {
  const pathname    = usePathname();
  const [q, setQ]   = useState(qActual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shouldFocus = sessionStorage.getItem(FOCUS_KEY);
    if (shouldFocus === "1") {
      sessionStorage.removeItem(FOCUS_KEY);
      const el = inputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, []);

  const hayFiltros = !!(q || marcaActual || rubroActual || subRubroActual || habilitadoActual || mejorPrecioActual);

  function navigate(updates: { q?: string; marca?: string; rubro?: string; subRubro?: string; habilitado?: string; mejorPrecio?: string }) {
    const p = new URLSearchParams();
    const qVal = updates.q !== undefined ? updates.q : q;
    const marcaVal = updates.marca !== undefined ? updates.marca : marcaActual;
    const rubroVal = updates.rubro !== undefined ? updates.rubro : rubroActual;
    const subRubroVal = updates.subRubro !== undefined ? updates.subRubro : subRubroActual;
    const habVal = updates.habilitado !== undefined ? updates.habilitado : habilitadoActual;
    const mejorVal = updates.mejorPrecio !== undefined ? updates.mejorPrecio : mejorPrecioActual;
    if (qVal) p.set("q", qVal);
    if (marcaVal) p.set("marca", marcaVal);
    if (rubroVal) p.set("rubro", rubroVal);
    if (subRubroVal) p.set("subRubro", subRubroVal);
    if (habVal) p.set("habilitado", habVal);
    if (mejorVal) p.set("mejorPrecio", mejorVal);
    window.location.href = `${pathname}?${p.toString()}`;
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (document.activeElement === inputRef.current) sessionStorage.setItem(FOCUS_KEY, "1");
      navigate({ q: value });
    }, 400);
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
  function handleHabilitado(value: string) {
    navigate({ habilitado: value });
  }
  function handleMejorPrecio(value: string) {
    navigate({ mejorPrecio: value });
  }

  function limpiarFiltros() {
    setQ("");
    window.location.href = pathname;
  }

  return (
    <FilterBar className="filtros-contenedor-tienda">
      <FilterRowSelection>
        <div className="fila-filtros-5 grid grid-cols-5 gap-3 w-full">
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select value={marcaActual || "none"} onValueChange={(v) => handleMarca(v === "none" ? "" : v)}>
              <SelectTrigger id="filtro-tienda-marca" className="input-filtro-unificado">
                <SelectValue placeholder="MARCA" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="none">MARCA</SelectItem>
                {marcas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select value={rubroActual || "none"} onValueChange={(v) => handleRubro(v === "none" ? "" : v)}>
              <SelectTrigger id="filtro-tienda-rubro" className="input-filtro-unificado">
                <SelectValue placeholder="RUBRO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="none">RUBRO</SelectItem>
                {rubros.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select value={subRubroActual || "none"} onValueChange={(v) => handleSubRubro(v === "none" ? "" : v)}>
              <SelectTrigger id="filtro-tienda-subrubro" className="input-filtro-unificado">
                <SelectValue placeholder="SUB-RUBRO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="none">SUB-RUBRO</SelectItem>
                {subRubros.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select value={mejorPrecioActual || "none"} onValueChange={(v) => handleMejorPrecio(v === "none" ? "" : v)}>
              <SelectTrigger id="filtro-tienda-mejor-precio" className="input-filtro-unificado">
                <SelectValue placeholder="COSTO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="none">COSTO</SelectItem>
                <SelectItem value="true">Menor Costo Disponible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select value={habilitadoActual || "none"} onValueChange={(v) => handleHabilitado(v === "none" ? "" : v)}>
              <SelectTrigger id="filtro-tienda-habilitado" className="input-filtro-unificado">
                <SelectValue placeholder="HABILITADO" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" className="select-content-filtro">
                <SelectItem value="none">HABILITADO</SelectItem>
                <SelectItem value="true">Habilitado</SelectItem>
                <SelectItem value="false">No habilitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterRowSelection>
      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
            <Input
              ref={inputRef}
              id="filtro-tienda-busqueda"
              value={q}
              onChange={(e) => handleQ(e.target.value)}
              placeholder="BUSCAR POR DESCRIPCIÓN, CÓDIGO O MARCA..."
              className="input-filtro-unificado pl-9 pr-8"
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
          {totalItems.toLocaleString()} item{totalItems !== 1 ? "s" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
