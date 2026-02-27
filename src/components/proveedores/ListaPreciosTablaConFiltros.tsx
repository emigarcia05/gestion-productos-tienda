"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import FilterBar, {
  FilterRowSelection,
  FilterRowSearch,
  INPUT_FILTER_CLASS,
  SELECT_TRIGGER_FILTER_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { fmtPrecio, fmtNumero } from "@/lib/format";

interface ProveedorOption {
  id: string;
  nombre: string;
  sufijo: string;
}

interface FilaListaPrecio {
  id: string;
  codExt: string;
  descripcionProveedor: string;
  pxListaProveedor: number | string;
  dtoProducto: number;
  dtoCantidad: number;
  cxAproxTransporte: number;
  pxCompraFinal: number | string | null;
  proveedor: { id: string; sufijo: string } | null;
}

interface ListaPreciosTablaConFiltrosProps {
  filas: FilaListaPrecio[];
  proveedores: ProveedorOption[];
}

export default function ListaPreciosTablaConFiltros({
  filas,
  proveedores,
}: ListaPreciosTablaConFiltrosProps) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");

  const filteredFilas = useMemo(() => {
    let result = filas;
    if (proveedorId) {
      result = result.filter((f) => f.proveedor?.id === proveedorId);
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter((f) =>
        f.descripcionProveedor.toLowerCase().includes(q)
      );
    }
    return result;
  }, [filas, proveedorId, busqueda]);

  const hayFiltros = !!proveedorId || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setBusqueda("");
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <FilterBar>
        <FilterRowSelection>
          <div className="grid grid-cols-5 gap-2 flex-1 min-w-0">
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={proveedorId || "none"}
                onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
              >
                <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      [{p.sufijo}] {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <span className={FILTER_COUNT_CLASS}>
            {filteredFilas.length.toLocaleString()} producto
            {filteredFilas.length !== 1 ? "s" : ""}
          </span>
        </FilterRowSelection>
        <div className="flex items-center gap-2">
          <FilterRowSearch>
            <Input
              id="filtro-lista-precios-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción..."
              className={`w-full ${INPUT_FILTER_CLASS}`}
              aria-label="Buscar por descripción"
            />
          </FilterRowSearch>
          <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
        </div>
      </FilterBar>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-white shadow-sm">
        <table className="tabla-global w-full text-sm">
          <thead>
            <tr>
              <th className="w-20">PROVEEDOR</th>
              <th className="w-32">COD. EXT.</th>
              <th className="min-w-[20rem]">DESCRIPCION</th>
              <th className="w-32">PX COMPRA FINAL</th>
              <th className="w-28">PX LISTA</th>
              <th className="w-28">DESC. PROD.</th>
              <th className="w-28">DESC. CANT.</th>
              <th className="w-32">CX. APROX TRANSPORTE</th>
            </tr>
          </thead>
          <tbody>
            {filteredFilas.map((fila) => (
              <tr key={fila.id}>
                <td className="py-2 px-3 text-xs font-mono">
                  {fila.proveedor?.sufijo ?? "—"}
                </td>
                <td className="py-2 px-3 text-xs font-mono whitespace-nowrap">
                  {fila.codExt}
                </td>
                <td className="py-2 px-3 text-xs font-bold">
                  {fila.descripcionProveedor}
                </td>
                <td className="py-2 px-3 tabular-nums text-xs font-bold text-right whitespace-nowrap">
                  ${fmtPrecio(Number(fila.pxCompraFinal ?? 0))}
                </td>
                <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                  ${fmtPrecio(Number(fila.pxListaProveedor))}
                </td>
                <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                  {fmtNumero(fila.dtoProducto)}%
                </td>
                <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                  {fmtNumero(fila.dtoCantidad)}%
                </td>
                <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                  {fmtNumero(fila.cxAproxTransporte)}%
                </td>
              </tr>
            ))}
            {filteredFilas.length === 0 && (
              <tr>
                <td
                  className="py-6 px-3 text-xs text-muted-foreground text-center"
                  colSpan={8}
                >
                  {filas.length === 0
                    ? "No hay datos de lista de precios para mostrar."
                    : "Ningún producto coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
