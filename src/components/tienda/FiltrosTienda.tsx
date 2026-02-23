"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const router      = useRouter();
  const pathname    = usePathname();
  const [q, setQ]   = useState(qActual);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hayFiltros = !!(q || marcaActual || rubroActual || subRubroActual || habilitadoActual || mejorPrecioActual);

  // Cada filtro reemplaza TODOS los demás — navegación limpia con un solo parámetro activo
  function navigateSolo(key: string, value: string) {
    const p = new URLSearchParams();
    if (value) p.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${p.toString()}`);
      router.refresh();
    });
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigateSolo("q", value), 400);
  }

  function handleMarca(value: string)    { navigateSolo("marca",      value); }
  function handleRubro(value: string)    { navigateSolo("rubro",      value); }
  function handleSubRubro(value: string) { navigateSolo("subRubro",   value); }
  function handleHabilitado(value: string) { navigateSolo("habilitado", value); }
  function handleMejorPrecio(value: string) { navigateSolo("mejorPrecio", value); }

  function limpiarFiltros() {
    setQ("");
    startTransition(() => {
      router.push(pathname);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Fila 1: buscador + botón limpiar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => handleQ(e.target.value)}
            placeholder="Buscar por descripción, código o marca..."
            className="pl-9"
          />
        </div>
        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="gap-1.5 text-muted-foreground shrink-0">
            <X className="h-3.5 w-3.5" /> Limpiar filtros
          </Button>
        )}
        <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {totalItems.toLocaleString()} item{totalItems !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Fila 2: dropdowns vinculantes */}
      <div className="flex flex-wrap gap-2">

        {/* Marca */}
        <div className="relative w-44">
          <select value={marcaActual} onChange={(e) => handleMarca(e.target.value)}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todas las marcas</option>
            {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Rubro — filtrado por marca */}
        <div className="relative w-44">
          <select value={rubroActual} onChange={(e) => handleRubro(e.target.value)}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los rubros</option>
            {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Sub-Rubro */}
        <div className="relative w-44">
          <select value={subRubroActual} onChange={(e) => handleSubRubro(e.target.value)}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los sub-rubros</option>
            {subRubros.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Oportunidad de Costo */}
        <div className="relative w-52">
          <select value={mejorPrecioActual} onChange={(e) => handleMejorPrecio(e.target.value)}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos</option>
            <option value="true">Menor Costo Disponible</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

      </div>
    </div>
  );
}
