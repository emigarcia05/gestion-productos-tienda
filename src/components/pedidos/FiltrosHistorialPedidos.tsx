"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FilaFiltrosDesplegables,
  FilterRowSelection,
  FilterRowSearch,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";

const SUCURSALES = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
] as const;

export type EstadoFiltroPedido = "SIN RECEPCION" | "RECEPCIONADO" | "ALL";

interface Proveedor {
  id: string;
  nombre: string;
  prefijo: string;
}

interface Props {
  proveedores: Proveedor[];
  proveedorId: string;
  sucursalCodigo: string;
  estado: EstadoFiltroPedido;
  q: string;
  total: number;
}

export default function FiltrosHistorialPedidos({
  proveedores,
  proveedorId,
  sucursalCodigo,
  estado,
  q,
  total,
}: Props) {
  const pathname = usePathname();
  const qLocalRef = useRef(q);

  function applyNavigate(
    updates: Partial<{
      proveedorId: string;
      sucursalCodigo: string;
      estado: EstadoFiltroPedido;
      q: string;
    }>
  ) {
    const nextProveedor =
      updates.proveedorId !== undefined ? updates.proveedorId : proveedorId;
    const nextSucursal =
      updates.sucursalCodigo !== undefined ? updates.sucursalCodigo : sucursalCodigo;
    const nextEstado = updates.estado !== undefined ? updates.estado : estado;
    const nextQ = updates.q !== undefined ? updates.q : qLocalRef.current;

    const search = new URLSearchParams();
    search.set("pagina", "1");
    if (nextProveedor.trim()) search.set("proveedor", nextProveedor.trim());
    if (nextSucursal) search.set("sucursal", nextSucursal);
    search.set("estado", nextEstado);
    if (nextQ.trim()) search.set("q", nextQ.trim());
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
    debounceMs: 700,
    focusStorageKey: "filtros-historial-pedidos-focus",
    onDebouncedSearch: (value) => {
      prepareNavigate();
      applyNavigate({ q: value });
    },
  });

  qLocalRef.current = qLocal;

  const hayFiltros =
    !!proveedorId.trim() ||
    !!sucursalCodigo ||
    estado === "RECEPCIONADO" ||
    estado === "ALL" ||
    !!qLocal.trim();

  function limpiarFiltros() {
    setQLocal("");
    applyNavigate({
      proveedorId: "",
      sucursalCodigo: "",
      estado: "SIN RECEPCION",
      q: "",
    });
  }

  return (
    <FilterBar className="px-4 filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={proveedorId || "none"}
              onValueChange={(v) =>
                applyNavigate({ proveedorId: v === "none" ? "" : v })
              }
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
              value={sucursalCodigo || "none"}
              onValueChange={(v) =>
                applyNavigate({ sucursalCodigo: v === "none" ? "" : v })
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
              value={estado}
              onValueChange={(v) => applyNavigate({ estado: v as EstadoFiltroPedido })}
            >
              <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                <SelectValue placeholder="ESTADO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                <SelectItem value="SIN RECEPCION">SIN RECEPCION</SelectItem>
                <SelectItem value="RECEPCIONADO">RECEPCIONADO</SelectItem>
                <SelectItem value="ALL">TODOS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div />
          <div />
        </FilaFiltrosDesplegables>
      </FilterRowSelection>

      <div className="flex items-center gap-3">
        <FilterRowSearch className="flex-1">
          <FiltroBusquedaInput
            id="filtro-historial-pedidos-busqueda"
            placeholder="BUSCAR POR DESCRIPCIÓN DE PRODUCTO EN EL PEDIDO..."
            value={qLocal}
            onChange={handleQChange}
            isDebouncing={isDebouncing}
            inputRef={inputRef}
          />
        </FilterRowSearch>
        <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {total.toLocaleString("es-AR")} PEDIDO{total === 1 ? "" : "S"}
        </span>
      </div>
    </FilterBar>
  );
}
