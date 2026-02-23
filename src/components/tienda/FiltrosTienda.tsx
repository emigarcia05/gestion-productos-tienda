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

  function navigate(params: {
    q?: string; marca?: string; rubro?: string; subRubro?: string;
    habilitado?: string; mejorPrecio?: string;
  }) {
    const p = new URLSearchParams();
    const nq          = params.q          ?? q;
    const nMarca      = params.marca      ?? marcaActual;
    const nRubro      = params.rubro      ?? rubroActual;
    const nSubRubro   = params.subRubro   ?? subRubroActual;
    const nHabilitado = params.habilitado ?? habilitadoActual;
    const nMejor      = params.mejorPrecio ?? mejorPrecioActual;
    if (nq)          p.set("q",          nq);
    if (nMarca)      p.set("marca",      nMarca);
    if (nRubro)      p.set("rubro",      nRubro);
    if (nSubRubro)   p.set("subRubro",   nSubRubro);
    if (nHabilitado) p.set("habilitado", nHabilitado);
    if (nMejor)      p.set("mejorPrecio", nMejor);
    startTransition(() => router.push(`${pathname}?${p.toString()}`));
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value }), 400);
  }

  // Al cambiar marca: resetear rubro y subRubro
  function handleMarca(value: string) {
    navigate({ marca: value, rubro: "", subRubro: "" });
  }

  // Al cambiar rubro: resetear subRubro
  function handleRubro(value: string) {
    navigate({ rubro: value, subRubro: "" });
  }

  function limpiarFiltros() {
    setQ("");
    startTransition(() => router.push(pathname));
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

        {/* Sub-Rubro — filtrado por marca + rubro */}
        <div className="relative w-44">
          <select value={subRubroActual} onChange={(e) => navigate({ subRubro: e.target.value })}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los sub-rubros</option>
            {subRubros.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Oportunidad de Costo */}
        <div className="relative w-52">
          <select value={mejorPrecioActual} onChange={(e) => navigate({ mejorPrecio: e.target.value })}
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
