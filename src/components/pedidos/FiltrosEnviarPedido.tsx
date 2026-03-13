"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FilterRowSelection,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
  SELECT_TRIGGER_FILTER_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPOS_PEDIDO, type SucursalPedido, type TipoPedido } from "@/lib/pedidos";

const SUCURSALES: { value: SucursalPedido; label: string }[] = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
];

const OPCIONES_TIPO: { value: TipoPedido; label: string }[] = [
  { value: "URGENTE", label: "URGENTE" },
  { value: "TINTOMETRICO", label: "TINTOMÉTRICO" },
  { value: "REPOSICION", label: "REPOSICIÓN" },
];

interface Proveedor {
  id: string;
  nombre: string;
  prefijo: string;
}

interface Props {
  sucursal: SucursalPedido | "";
  proveedor: string;
  tipos: TipoPedido[];
  proveedores: Proveedor[];
}

export default function FiltrosEnviarPedido({
  sucursal,
  proveedor,
  tipos,
  proveedores,
}: Props) {
  const pathname = usePathname();
  const multiRef = useRef<HTMLDivElement>(null);
  const [multiOpen, setMultiOpen] = useState(false);

  function updateUrl(updates: {
    sucursal?: string;
    proveedor?: string;
    tipos?: TipoPedido[];
  }) {
    const next = {
      sucursal: sucursal || "",
      proveedor: proveedor || "",
      tipos: tipos ?? [],
    };
    if (updates.sucursal !== undefined) next.sucursal = updates.sucursal;
    if (updates.proveedor !== undefined) next.proveedor = updates.proveedor;
    if (updates.tipos !== undefined) next.tipos = updates.tipos;
    const search = new URLSearchParams();
    if (next.sucursal) search.set("sucursal", next.sucursal);
    if (next.proveedor) search.set("proveedor", next.proveedor);
    if (next.tipos.length > 0) search.set("tipo", next.tipos.join(","));
    window.location.href = `${pathname}?${search.toString()}`;
  }

  function toggleTipo(t: TipoPedido) {
    const next = tipos.includes(t) ? tipos.filter((k) => k !== t) : [...tipos, t];
    updateUrl({ tipos: next });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (multiRef.current && !multiRef.current.contains(e.target as Node)) {
        setMultiOpen(false);
      }
    }
    if (multiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [multiOpen]);

  const hayFiltros = !!(sucursal || proveedor || tipos.length > 0);

  function limpiarFiltros() {
    updateUrl({ sucursal: "", proveedor: "", tipos: [] });
  }

  const labelTipo =
    tipos.length === 0
      ? "TIPO DE PEDIDO"
      : tipos.length === TIPOS_PEDIDO.length
        ? "TODOS"
        : tipos.map((t) => OPCIONES_TIPO.find((o) => o.value === t)?.label ?? t).join(", ");

  return (
    <FilterBar className="px-4 filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={proveedor || "none"}
              onValueChange={(v) => updateUrl({ proveedor: v === "none" ? "" : v })}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="PROVEEDOR" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">PROVEEDOR</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.prefijo}] {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={sucursal || "none"}
              onValueChange={(v) =>
                updateUrl({ sucursal: v === "none" ? "" : (v as SucursalPedido) })
              }
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="SUCURSAL" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="none">SUCURSAL</SelectItem>
                {SUCURSALES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={cn(FILTER_SELECT_WRAPPER_CLASS, "relative")} ref={multiRef}>
            <button
              type="button"
              onClick={() => setMultiOpen((o) => !o)}
              className={cn(
                SELECT_TRIGGER_FILTER_CLASS,
                "flex w-full items-center justify-between gap-2 text-left font-semibold"
              )}
              aria-expanded={multiOpen}
              aria-haspopup="listbox"
              aria-label="Tipo de pedido (selección múltiple)"
            >
              <span className="truncate">{labelTipo}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
            {multiOpen && (
              <div
                className="absolute top-full left-0 z-50 mt-1 min-w-full rounded-md border border-border bg-popover p-1 shadow-md"
                role="listbox"
                aria-multiselectable="true"
              >
                {OPCIONES_TIPO.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={tipos.includes(opt.value)}
                      onChange={() => toggleTipo(opt.value)}
                      className="h-4 w-4 rounded border-border"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex justify-end w-full">
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
      </div>
    </FilterBar>
  );
}
