"use client";

import { useRef, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Loader2, X } from "lucide-react";
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
  accionMasivaSlot?: React.ReactNode;
}

export default function FiltrosProductos({ proveedores, totalProductos, qActual, proveedorActual, accionMasivaSlot }: Props) {
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

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Buscar por descripción o código..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring pr-7"
        />
        {q && !buscando && (
          <button
            onClick={() => handleQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {buscando && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin pointer-events-none" />
        )}
      </div>

      <div className="relative sm:w-64">
        <select
          value={proveedorActual}
          onChange={(e) => handleProveedor(e.target.value)}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      {accionMasivaSlot}

      <p className="text-xs text-muted-foreground whitespace-nowrap">
        {totalProductos.toLocaleString()} producto{totalProductos !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
