"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, { FilterRowSelection, FilterRowSearch, INPUT_FILTER_CLASS, SELECT_TRIGGER_FILTER_CLASS, FILTER_COUNT_CLASS, LimpiarFiltrosButton } from "@/components/FilterBar";

const FOCUS_KEY = "filtros-proveedores-focus";

interface Proveedor {
  id: string;
  nombre: string;
  codigoUnico: string;
  sufijo: string;
}

interface Props {
  proveedores: Proveedor[];
  totalProductos: number;
  qActual: string;
  proveedorActual: string;
}

export default function FiltrosProductos({ proveedores, totalProductos, qActual, proveedorActual }: Props) {
  const pathname = usePathname();
  const [q, setQ] = useState(qActual);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Al montar, si venimos de una búsqueda, restaurar el foco al final del texto
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

  function navigate(nuevoQ: string, nuevoProveedor: string) {
    const params = new URLSearchParams();
    if (nuevoQ)         params.set("q", nuevoQ);
    if (nuevoProveedor) params.set("proveedor", nuevoProveedor);
    // Marcar que el foco venía del input de búsqueda (no del selector de proveedor)
    if (document.activeElement === inputRef.current) sessionStorage.setItem(FOCUS_KEY, "1");
    window.location.href = `${pathname}?${params.toString()}`;
  }

  function handleQ(value: string) {
    setQ(value);
    setBuscando(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(value, proveedorActual), 600);
  }

  function handleProveedor(value: string) {
    navigate(q, value);
  }

  const hayFiltros = !!(proveedorActual || q);

  function limpiarFiltros() {
    setQ("");
    window.location.href = pathname;
  }

  return (
    <FilterBar>
      <FilterRowSelection>
        <Select value={proveedorActual || "none"} onValueChange={(v) => handleProveedor(v === "none" ? "" : v)}>
          <SelectTrigger className={`w-[220px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
            <SelectValue placeholder="PROVEEDOR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">PROVEEDORES</SelectItem>
            {proveedores.map((p) => (
              <SelectItem key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={FILTER_COUNT_CLASS}>
          {totalProductos.toLocaleString()} producto{totalProductos !== 1 ? "s" : ""}
        </span>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
            <Input
              ref={inputRef}
              id="filtro-proveedores-busqueda"
              value={q}
              onChange={(e) => handleQ(e.target.value)}
              placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
              className={`pl-9 pr-8 w-full ${INPUT_FILTER_CLASS}`}
            />
            {q && !buscando && (
              <button
                type="button"
                onClick={() => handleQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {buscando && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin pointer-events-none" />
            )}
          </div>
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
      </div>
    </FilterBar>
  );
}
