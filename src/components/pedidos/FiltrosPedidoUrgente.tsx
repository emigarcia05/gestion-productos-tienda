"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, { FilterRowSelection, FilterRowSearch, INPUT_FILTER_CLASS, SELECT_TRIGGER_FILTER_CLASS, FILTER_COUNT_CLASS, LimpiarFiltrosButton } from "@/components/FilterBar";

export type SucursalPedido = "guaymallen" | "maipu";

const SUCURSALES: { value: SucursalPedido; label: string }[] = [
  { value: "guaymallen", label: "Guaymallén" },
  { value: "maipu", label: "Maipú" },
];

interface Proveedor {
  id: string;
  nombre: string;
  sufijo: string;
}

interface Props {
  q: string;
  sucursal: SucursalPedido | "";
  proveedor: string;
  proveedores: Proveedor[];
  totalProductos: number;
}

export default function FiltrosPedidoUrgente({ q, sucursal, proveedor, proveedores, totalProductos }: Props) {
  const pathname = usePathname();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qLocal, setQLocal] = React.useState(q);

  React.useEffect(() => setQLocal(q), [q]);

  function updateUrl(updates: { q?: string; sucursal?: string; proveedor?: string }) {
    const next = { q, sucursal: sucursal || "", proveedor: proveedor || "" };
    if (updates.q !== undefined) next.q = updates.q;
    if (updates.sucursal !== undefined) next.sucursal = updates.sucursal;
    if (updates.proveedor !== undefined) next.proveedor = updates.proveedor;
    const search = new URLSearchParams();
    if (next.q) search.set("q", next.q);
    if (next.sucursal) search.set("sucursal", next.sucursal);
    if (next.proveedor) search.set("proveedor", next.proveedor);
    window.location.href = `${pathname}?${search.toString()}`;
  }

  function handleSearch(value: string) {
    setQLocal(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateUrl({ q: value }), 400);
  }

  const hayFiltros = !!(q || sucursal || proveedor);

  function limpiarFiltros() {
    setQLocal("");
    updateUrl({ q: "", sucursal: "", proveedor: "" });
  }

  return (
    <FilterBar className="px-4">
      <FilterRowSelection>
        <Select value={sucursal || "none"} onValueChange={(v) => updateUrl({ sucursal: v === "none" ? "" : (v as SucursalPedido) })}>
          <SelectTrigger className={`w-[180px] ${SELECT_TRIGGER_FILTER_CLASS}`}>
            <SelectValue placeholder="SUCURSAL" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">SUCURSAL</SelectItem>
            {SUCURSALES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={proveedor || "none"} onValueChange={(v) => updateUrl({ proveedor: v === "none" ? "" : v })}>
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
              id="filtro-pedidos-busqueda"
              value={qLocal}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
              className={`pl-9 w-full ${INPUT_FILTER_CLASS}`}
            />
          </div>
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
      </div>
    </FilterBar>
  );
}
