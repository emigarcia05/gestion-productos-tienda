"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition, useRef, useState } from "react";
import { Search, ChevronDown, Loader2 } from "lucide-react";
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
}

export default function FiltrosProductos({ proveedores, totalProductos }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const proveedor = searchParams.get("proveedor") ?? "";

  // Estado local del input para que la escritura sea fluida
  const [inputValue, setInputValue] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("pagina");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [searchParams, pathname, router]);

  function handleBusqueda(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate("q", value), 400);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        {pending && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />}
        <Input
          placeholder="Buscar por descripción o código..."
          value={inputValue}
          onChange={(e) => handleBusqueda(e.target.value)}
          className="pl-9 pr-9"
        />
      </div>

      <div className="relative sm:w-64">
        <select
          value={proveedor}
          onChange={(e) => navigate("proveedor", e.target.value)}
          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>[{p.sufijo}] {p.nombre}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <AccionMasivaModal proveedores={proveedores} />

      <p className="text-xs text-muted-foreground whitespace-nowrap">
        {totalProductos.toLocaleString()} producto{totalProductos !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
