"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const FOCUS_KEY = "buscador-simple-focus";

interface Props {
  qActual: string;
  totalProductos: number;
  /** Parámetros a conservar en la URL al buscar (ej. sucursal) */
  extraParams?: Record<string, string>;
}

export default function BuscadorSimple({ qActual, totalProductos, extraParams }: Props) {
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
    <div className="flex items-center gap-3">
      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Buscar por descripción..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-7"
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
      <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {totalProductos.toLocaleString()} producto{totalProductos !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
