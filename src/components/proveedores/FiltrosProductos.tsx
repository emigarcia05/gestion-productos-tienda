"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const router   = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(qActual);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  function navigate(nuevoQ: string, nuevoProveedor: string) {
    const params = new URLSearchParams();
    if (nuevoQ)        params.set("q", nuevoQ);
    if (nuevoProveedor) params.set("proveedor", nuevoProveedor);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleQ(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(value, proveedorActual), 400);
  }

  function handleProveedor(value: string) {
    navigate(q, value);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => handleQ(e.target.value)}
          placeholder="Buscar por descripción o código..."
          className="pl-9"
        />
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
