"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import FilterBar, { FilterRowSelection, FilterRowSearch, INPUT_FILTER_CLASS, FILTER_LABEL_CLASS } from "@/components/FilterBar";

const FOCUS_KEY = "buscador-simple-focus";

interface Props {
  qActual: string;
  totalProductos: number;
  extraParams?: Record<string, string>;
}

export default function BuscadorSimple({ qActual, totalProductos, extraParams }: Props) {
  const pathname = usePathname();
  const [q, setQ] = useState(qActual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (document.activeElement === inputRef.current) sessionStorage.setItem(FOCUS_KEY, "1");
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      if (extraParams) for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
      window.location.href = `${pathname}?${params.toString()}`;
    }, 400);
  }

  return (
    <FilterBar>
      <FilterRowSelection>
        <span className="text-sm text-slate-500 tabular-nums pb-1">
          {totalProductos.toLocaleString()} producto{totalProductos !== 1 ? "s" : ""}
        </span>
      </FilterRowSelection>
      <FilterRowSearch>
        <label className={FILTER_LABEL_CLASS} htmlFor="buscador-simple">Búsqueda</label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
          <Input
            ref={inputRef}
            id="buscador-simple"
            value={q}
            onChange={(e) => handleQ(e.target.value)}
            placeholder="Buscar por descripción..."
            className={`pl-9 pr-8 w-full ${INPUT_FILTER_CLASS}`}
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
      </FilterRowSearch>
    </FilterBar>
  );
}
