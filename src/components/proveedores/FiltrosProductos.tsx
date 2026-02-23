"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, ChevronDown, Loader2, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("pagina"); // resetear a página 1 al filtrar
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [searchParams, pathname, router]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        {pending && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />}
        <Input
          placeholder="Buscar por descripción o código..."
          defaultValue={q}
          onChange={(e) => updateParam("q", e.target.value)}
          className="pl-9 pr-9"
        />
      </div>

      <div className="relative sm:w-64">
        <select
          value={proveedor}
          onChange={(e) => updateParam("proveedor", e.target.value)}
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
