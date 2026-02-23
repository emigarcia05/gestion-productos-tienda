"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  rubros: string[];
  marcas: string[];
  totalItems: number;
  qActual: string;
  rubroActual: string;
  marcaActual: string;
  habilitadoActual: string;
}

export default function FiltrosTienda({
  rubros, marcas, totalItems,
  qActual, rubroActual, marcaActual, habilitadoActual,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(qActual);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(params: { q?: string; rubro?: string; marca?: string; habilitado?: string }) {
    const p = new URLSearchParams();
    const nuevoQ         = params.q         ?? q;
    const nuevoRubro     = params.rubro     ?? rubroActual;
    const nuevaMarca     = params.marca     ?? marcaActual;
    const nuevoHabilitado = params.habilitado ?? habilitadoActual;
    if (nuevoQ)          p.set("q",          nuevoQ);
    if (nuevoRubro)      p.set("rubro",      nuevoRubro);
    if (nuevaMarca)      p.set("marca",      nuevaMarca);
    if (nuevoHabilitado) p.set("habilitado", nuevoHabilitado);
    startTransition(() => {
      router.push(`${pathname}?${p.toString()}`);
    });
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value }), 400);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">

      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Buscar por descripción, código o marca..."
          className="pl-9"
        />
      </div>

      <div className="relative sm:w-52">
        <select value={rubroActual} onChange={(e) => navigate({ rubro: e.target.value })}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos los rubros</option>
          {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="relative sm:w-44">
        <select value={marcaActual} onChange={(e) => navigate({ marca: e.target.value })}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="relative sm:w-36">
        <select value={habilitadoActual} onChange={(e) => navigate({ habilitado: e.target.value })}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Todos</option>
          <option value="true">Habilitados</option>
          <option value="false">Deshabilitados</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <p className="text-xs text-muted-foreground whitespace-nowrap">
        {totalItems.toLocaleString()} item{totalItems !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
