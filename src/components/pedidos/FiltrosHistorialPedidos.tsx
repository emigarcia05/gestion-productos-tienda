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
  FilaFiltrosDesplegables,
  FilterRowSelection,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import { cn } from "@/lib/utils";

const SUCURSALES = [
  { value: "guaymallen", label: "GUAYMALLÉN" },
  { value: "maipu", label: "MAIPÚ" },
] as const;

export type EstadoFiltroPedido = "PEDIDO" | "REGISTRADO" | "";

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
  total: number;
}

export default function FiltrosHistorialPedidos({
  proveedores,
  proveedorId,
  sucursalCodigo,
  estado,
  total,
}: Props) {
  const pathname = usePathname();

  function updateUrl(updates: Partial<{ proveedorId: string; sucursalCodigo: string; estado: EstadoFiltroPedido }>) {
    const nextProveedor = updates.proveedorId !== undefined ? updates.proveedorId : proveedorId;
    const nextSucursal = updates.sucursalCodigo !== undefined ? updates.sucursalCodigo : sucursalCodigo;
    const nextEstado = updates.estado !== undefined ? updates.estado : estado;

    const search = new URLSearchParams();
    search.set("pagina", "1");

    if (nextProveedor.trim()) search.set("proveedor", nextProveedor.trim());
    if (nextSucursal) search.set("sucursal", nextSucursal);
    if (nextEstado) search.set("estado", nextEstado);

    const qs = search.toString();
    window.location.href = `${pathname}?${qs}`;
  }

  const hayFiltros = !!proveedorId.trim() || !!sucursalCodigo || !!estado;

  return (
    <FilterBar className="px-4 filtros-contenedor-tienda bg-card">
      <FilterRowSelection>
        <FilaFiltrosDesplegables>
          <div className={FILTER_SELECT_WRAPPER_CLASS}>
            <Select
              value={proveedorId || "none"}
              onValueChange={(v) => updateUrl({ proveedorId: v === "none" ? "" : v })}
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
              onValueChange={(v) => updateUrl({ sucursalCodigo: v === "none" ? "" : v })}
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
              value={estado || "none"}
              onValueChange={(v) => updateUrl({ estado: v === "none" ? "" : (v as "PEDIDO" | "REGISTRADO") })}
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
                <SelectItem value="none">ESTADO</SelectItem>
                <SelectItem value="PEDIDO">PEDIDO</SelectItem>
                <SelectItem value="REGISTRADO">REGISTRADO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slots vacíos (grid 5 columnas) */}
          <div />
          <div />
        </FilaFiltrosDesplegables>
      </FilterRowSelection>

      <div className="flex items-center gap-3">
        <LimpiarFiltrosButton
          visible={hayFiltros}
          onClick={() => updateUrl({ proveedorId: "", sucursalCodigo: "", estado: "" })}
        />
        <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
          {total.toLocaleString("es-AR")} PEDIDO{total === 1 ? "" : "S"}
        </span>
      </div>
    </FilterBar>
  );
}

