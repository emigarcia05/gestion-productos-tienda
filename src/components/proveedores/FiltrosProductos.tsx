"use client";

import { useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import AccionMasivaModal from "@/components/proveedores/AccionMasivaModal";

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

const CURSOR_KEY = "filtros_q_cursor";

export default function FiltrosProductos({ proveedores, totalProductos, qActual, proveedorActual }: Props) {
  const formRef  = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restaurar foco y posición del cursor después de la navegación
  useEffect(() => {
    const pos = sessionStorage.getItem(CURSOR_KEY);
    if (pos !== null && inputRef.current) {
      inputRef.current.focus();
      const n = parseInt(pos, 10);
      inputRef.current.setSelectionRange(n, n);
      sessionStorage.removeItem(CURSOR_KEY);
    }
  }, [qActual]);

  function submitForm() {
    // Guardar posición del cursor antes de navegar
    if (inputRef.current) {
      sessionStorage.setItem(CURSOR_KEY, String(inputRef.current.selectionStart ?? 0));
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action="" method="GET" className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          name="q"
          placeholder="Buscar por descripción o código..."
          defaultValue={qActual}
          onChange={() => {
            clearTimeout((formRef.current as HTMLFormElement & { _t?: ReturnType<typeof setTimeout> })._t);
            (formRef.current as HTMLFormElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(submitForm, 400);
          }}
          className="pl-9"
        />
      </div>

      <div className="relative sm:w-64">
        <select
          name="proveedor"
          defaultValue={proveedorActual}
          onChange={submitForm}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <AccionMasivaModal
        proveedores={proveedores}
        filtroProveedorActual={proveedorActual}
        filtroBusquedaActual={qActual}
        totalFiltrado={totalProductos}
      />

      <p className="text-xs text-muted-foreground whitespace-nowrap">
        {totalProductos.toLocaleString()} producto{totalProductos !== 1 ? "s" : ""}
      </p>
    </form>
  );
}
