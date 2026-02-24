"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <div className="flex gap-2 items-center">

      {/* Buscador */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Buscar por descripción, código o marca..."
          className="pl-8 pr-7 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {q && (
          <button
            onClick={() => handleQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Marca */}
      <div className="relative w-40 shrink-0">
        <select value={marcaActual} onChange={(e) => handleMarca(e.target.value)}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Rubro */}
      <div className="relative w-40 shrink-0">
        <select value={rubroActual} onChange={(e) => handleRubro(e.target.value)}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos los rubros</option>
          {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Sub-Rubro */}
      <div className="relative w-40 shrink-0">
        <select value={subRubroActual} onChange={(e) => handleSubRubro(e.target.value)}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos los sub-rubros</option>
          {subRubros.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Oportunidad de Costo */}
      <div className="relative w-48 shrink-0">
        <select value={mejorPrecioActual} onChange={(e) => handleMejorPrecio(e.target.value)}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos</option>
          <option value="true">Menor Costo Disponible</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Limpiar + contador */}
      {hayFiltros && (
        <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="gap-1.5 text-muted-foreground shrink-0">
          <X className="h-3.5 w-3.5" /> Limpiar
        </Button>
      )}
      <p className="text-xs text-accent2 whitespace-nowrap shrink-0">
        {totalItems.toLocaleString()} item{totalItems !== 1 ? "s" : ""}
      </p>

    </div>
  );
}
