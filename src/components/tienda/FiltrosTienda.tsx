"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import FilterBar, { INPUT_FILTER_CLASS, SELECT_TRIGGER_FILTER_CLASS } from "@/components/FilterBar";

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

  function navigateSolo(key: string, value: string) {
    const p = new URLSearchParams();
    if (value) p.set(key, value);
    window.location.href = `${pathname}?${p.toString()}`;
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (document.activeElement === inputRef.current) sessionStorage.setItem(FOCUS_KEY, "1");
      navigateSolo("q", value);
    }, 400);
  }

  function handleMarca(value: string)    { navigateSolo("marca",      value); }
  function handleRubro(value: string)    { navigateSolo("rubro",      value); }
  function handleSubRubro(value: string) { navigateSolo("subRubro",   value); }
  function handleHabilitado(value: string) { navigateSolo("habilitado", value); }
  function handleMejorPrecio(value: string) { navigateSolo("mejorPrecio", value); }

  function limpiarFiltros() {
    setQ("");
    window.location.href = pathname;
  }

  return (
    <FilterBar>
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Buscar por descripción, código o marca..."
          className={`pl-9 pr-8 ${INPUT_FILTER_CLASS}`}
        />
        {q && (
          <button
            type="button"
            onClick={() => handleQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Select value={marcaActual || "none"} onValueChange={(v) => handleMarca(v === "none" ? "" : v)}>
        <SelectTrigger className={`w-[140px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todas las marcas</SelectItem>
          {marcas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={rubroActual || "none"} onValueChange={(v) => handleRubro(v === "none" ? "" : v)}>
        <SelectTrigger className={`w-[140px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
          <SelectValue placeholder="Rubro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todos los rubros</SelectItem>
          {rubros.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={subRubroActual || "none"} onValueChange={(v) => handleSubRubro(v === "none" ? "" : v)}>
        <SelectTrigger className={`w-[140px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
          <SelectValue placeholder="Sub-rubro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todos los sub-rubros</SelectItem>
          {subRubros.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={mejorPrecioActual || "none"} onValueChange={(v) => handleMejorPrecio(v === "none" ? "" : v)}>
        <SelectTrigger className={`w-[180px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
          <SelectValue placeholder="Costo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todos</SelectItem>
          <SelectItem value="true">Menor Costo Disponible</SelectItem>
        </SelectContent>
      </Select>
      <Select value={habilitadoActual || "none"} onValueChange={(v) => handleHabilitado(v === "none" ? "" : v)}>
        <SelectTrigger className={`w-[120px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todos</SelectItem>
          <SelectItem value="true">Habilitado</SelectItem>
          <SelectItem value="false">No habilitado</SelectItem>
        </SelectContent>
      </Select>
      {hayFiltros && (
        <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="gap-1.5 text-slate-500 hover:text-slate-700 shrink-0 transition-colors">
          <X className="h-3.5 w-3.5" /> Limpiar
        </Button>
      )}
      <span className="text-sm text-slate-500 tabular-nums shrink-0">
        {totalItems.toLocaleString()} item{totalItems !== 1 ? "s" : ""}
      </span>
    </FilterBar>
  );
}
