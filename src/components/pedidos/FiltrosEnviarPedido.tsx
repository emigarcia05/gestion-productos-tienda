"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FiltroIndividualContainer,
  FilterRowSelection,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
  SELECT_TRIGGER_FILTER_CLASS,
  FilterRowSearch,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterItemsBySelectSearch } from "@/lib/selectSearch";
import SelectSearchInput from "@/components/shared/SelectSearchInput";
import { TIPOS_PEDIDO, type SucursalPedido, type TipoPedido } from "@/lib/pedidos";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";

type SucursalFiltroOption = { value: SucursalPedido; label: string };

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
  sucursales: SucursalFiltroOption[];
  q: string;
}

export default function FiltrosEnviarPedido({
  sucursal,
  proveedor,
  tipos,
  proveedores,
  sucursales,
  q: qActual,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const multiRef = useRef<HTMLDivElement>(null);
  const [multiOpen, setMultiOpen] = useState(false);
  const [tipoQuery, setTipoQuery] = useState("");

  const opcionesTipoFiltradas = filterItemsBySelectSearch(
    OPCIONES_TIPO,
    tipoQuery,
    (o) => o.label
  );

  function updateUrl(updates: {
    sucursal?: string;
    proveedor?: string;
    tipos?: TipoPedido[];
    q?: string;
  }) {
    const next = {
      sucursal: sucursal || "",
      proveedor: proveedor || "",
      tipos: tipos ?? [],
      q: qActual || "",
    };
    if (updates.sucursal !== undefined) next.sucursal = updates.sucursal;
    if (updates.proveedor !== undefined) next.proveedor = updates.proveedor;
    if (updates.tipos !== undefined) next.tipos = updates.tipos;
    if (updates.q !== undefined) next.q = updates.q;
    const search = new URLSearchParams();
    if (next.sucursal) search.set("sucursal", next.sucursal);
    if (next.proveedor) search.set("proveedor", next.proveedor);
    if (next.tipos.length > 0) search.set("tipo", next.tipos.join(","));
    if (next.q.trim()) search.set("q", next.q.trim());
    router.push(`${pathname}?${search.toString()}`);
  }

  function toggleTipo(t: TipoPedido) {
    const next = tipos.includes(t) ? tipos.filter((k) => k !== t) : [...tipos, t];
    updateUrl({
      tipos: next,
      ...(next.length === 0 ? { proveedor: "" } : {}),
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (multiRef.current && !multiRef.current.contains(e.target as Node)) {
        setMultiOpen(false);
        setTipoQuery("");
      }
    }
    if (multiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [multiOpen]);

  const hayFiltros = !!(sucursal || proveedor || tipos.length > 0);
  const hayFiltrosOBusqueda = hayFiltros || !!qActual.trim();

  function limpiarFiltros() {
    setQ("");
    updateUrl({ sucursal: "", proveedor: "", tipos: [], q: "" });
  }

  const proveedorHabilitado = Boolean(sucursal) && tipos.length > 0;

  const labelTipo = !sucursal
    ? "TIPO DE PEDIDO (elegí sucursal)"
    : tipos.length === 0
      ? "TIPO DE PEDIDO"
      : tipos.length === TIPOS_PEDIDO.length
        ? "TODOS"
        : tipos.map((t) => OPCIONES_TIPO.find((o) => o.value === t)?.label ?? t).join(", ");

  const { q, setQ, ref: inputRef, handleQChange, isDebouncing } = useFiltrosConBusqueda({
    qActual,
    debounceMs: 700,
    onDebouncedSearch: (value) => {
      updateUrl({ q: value });
    },
  });

  return (
    <FilterBar className="px-4 filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(sucursal)}
            onLimpiar={() => updateUrl({ sucursal: "", tipos: [], proveedor: "" })}
          >
            <Select
              value={sucursal || undefined}
              onValueChange={(v) =>
                updateUrl({
                  sucursal: v as SucursalPedido,
                  tipos: [],
                  proveedor: "",
                })
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
                {sucursales.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={cn(FILTER_SELECT_WRAPPER_CLASS, "relative")}
            activo={tipos.length > 0}
            onLimpiar={() => updateUrl({ tipos: [], proveedor: "" })}
          >
          <div className="relative" ref={multiRef}>
            <button
              type="button"
              disabled={!sucursal}
              onClick={() => {
                if (!sucursal) return;
                setMultiOpen((o) => {
                  const next = !o;
                  if (!next) setTipoQuery("");
                  return next;
                });
              }}
              className={cn(
                SELECT_TRIGGER_FILTER_CLASS,
                "flex w-full items-center justify-between gap-2 text-left font-semibold",
                !sucursal && "pointer-events-none opacity-50"
              )}
              aria-expanded={multiOpen}
              aria-haspopup="listbox"
              aria-disabled={!sucursal}
              aria-label="Tipo de pedido (selección múltiple)"
            >
              <span className="truncate">{labelTipo}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>
            {multiOpen && (
              <div
                className="absolute top-full left-0 z-50 mt-1 flex min-w-full flex-col overflow-hidden rounded-md border border-border bg-popover shadow-md"
                role="listbox"
                aria-multiselectable="true"
              >
                <div className="shrink-0 border-b border-border p-1">
                  <SelectSearchInput
                    value={tipoQuery}
                    onValueChange={setTipoQuery}
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {opcionesTipoFiltradas.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground" role="status">
                      SIN RESULTADOS
                    </p>
                  ) : (
                    opcionesTipoFiltradas.map((opt) => {
                      const selected = tipos.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted",
                            selected && "bg-muted"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleTipo(opt.value)}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                            aria-label={opt.label}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          </FiltroIndividualContainer>
          <FiltroIndividualContainer
            className={FILTER_SELECT_WRAPPER_CLASS}
            activo={Boolean(proveedor)}
            onLimpiar={() => updateUrl({ proveedor: "" })}
          >
            <Select
              value={proveedor || undefined}
              onValueChange={(v) => updateUrl({ proveedor: v })}
              disabled={!proveedorHabilitado}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue
                  placeholder={
                    !sucursal
                      ? "PROVEEDOR (elegí sucursal y tipo)"
                      : tipos.length === 0
                        ? "PROVEEDOR (elegí tipo de pedido)"
                        : proveedores.length === 0
                          ? "SIN PROVEEDORES CON PEDIDO"
                          : "PROVEEDOR"
                  }
                />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.prefijo}] {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput
            id="enviar-pedido-descripcion"
            placeholder="BUSCAR POR DESCRIPCIÓN..."
            value={q}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltrosOBusqueda} onClick={limpiarFiltros} />
      </div>
    </FilterBar>
  );
}
