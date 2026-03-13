"use client";

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
  FilterRowSearch,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
  SELECT_TRIGGER_FILTER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";

export type SucursalPedido = "guaymallen" | "maipu";

const SUCURSALES: { value: SucursalPedido; label: string }[] = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
];

interface Proveedor {
  id: string;
  nombre: string;
  prefijo: string;
}

export type FiltroPedidoValor = "si" | "no" | "";

interface Props {
  q: string;
  sucursal: SucursalPedido | "";
  proveedor: string;
  pedido: FiltroPedidoValor;
  proveedores: Proveedor[];
  totalProductos: number;
}

const OPCIONES_PEDIDO: { value: FiltroPedidoValor | "none"; label: string }[] = [
  { value: "none", label: "PEDIDO" },
  { value: "si", label: "SÍ" },
  { value: "no", label: "NO" },
];

export default function FiltrosPedidoUrgente({
  q,
  sucursal,
  proveedor,
  pedido,
  proveedores,
  totalProductos,
}: Props) {
  const pathname = usePathname();

  function updateUrl(updates: {
    q?: string;
    sucursal?: string;
    proveedor?: string;
    pedido?: FiltroPedidoValor;
  }) {
    const next = {
      q,
      sucursal: sucursal || "",
      proveedor: proveedor || "",
      pedido: pedido || "",
    };
    if (updates.q !== undefined) next.q = updates.q;
    if (updates.sucursal !== undefined) next.sucursal = updates.sucursal;
    if (updates.proveedor !== undefined) next.proveedor = updates.proveedor;
    if (updates.pedido !== undefined) next.pedido = updates.pedido;
    const search = new URLSearchParams();
    if (next.q) search.set("q", next.q);
    if (next.sucursal) search.set("sucursal", next.sucursal);
    if (next.proveedor) search.set("proveedor", next.proveedor);
    if (next.pedido) search.set("pedido", next.pedido);
    window.location.href = `${pathname}?${search.toString()}`;
  }

  const {
    q: qLocal,
    setQ: setQLocal,
    ref: inputRef,
    handleQChange,
    isDebouncing,
    prepareNavigate,
  } = useFiltrosConBusqueda({
    qActual: q,
    debounceMs: 400,
    focusStorageKey: "filtros-pedido-urgente-focus",
    onDebouncedSearch: (value) => {
      prepareNavigate();
      updateUrl({ q: value });
    },
  });

  const hayFiltros = !!(qLocal || sucursal || proveedor || pedido);

  function limpiarFiltros() {
    setQLocal("");
    updateUrl({ q: "", sucursal: "", proveedor: "", pedido: "" });
  }

  return (
    <FilterBar className="px-4 filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
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
                <SelectItem value="none">PROVEEDORES</SelectItem>
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
              value={pedido || "none"}
              onValueChange={(v) =>
                updateUrl({ pedido: v === "none" ? "" : (v as FiltroPedidoValor) })
              }
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="PEDIDO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {OPCIONES_PEDIDO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilaFiltrosDesplegables>
      </FilterRowSelection>
      <div className="flex items-center gap-2">
        <FilterRowSearch>
          <FiltroBusquedaInput
            id="filtro-pedidos-busqueda"
            placeholder="BUSCAR POR DESCRIPCIÓN O CÓDIGO..."
            value={qLocal}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
      </div>
      <div className="flex justify-end w-full">
        <span className={FILTER_COUNT_CLASS}>
          {totalProductos.toLocaleString()} PRODUCTO
          {totalProductos !== 1 ? "S" : ""}
        </span>
      </div>
    </FilterBar>
  );
}
