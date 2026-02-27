"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const FILAS_POR_PAGINA = 25;

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
  const [paginaActual, setPaginaActual] = useState(1);

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

  const totalPaginas = Math.max(
    1,
    Math.ceil(filteredFilas.length / FILAS_POR_PAGINA)
  );
  const filasPagina = useMemo(() => {
    const desde = (paginaActual - 1) * FILAS_POR_PAGINA;
    return filteredFilas.slice(desde, desde + FILAS_POR_PAGINA);
  }, [filteredFilas, paginaActual]);

  useEffect(() => {
    setPaginaActual(1);
  }, [proveedorId, busqueda]);

  useEffect(() => {
    if (totalPaginas > 0 && paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  const hayFiltros = !!proveedorId || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setBusqueda("");
    setPaginaActual(1);
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
                  <SelectValue placeholder="PROVEEDOR" />
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
            {filasPagina.map((fila) => (
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
            {filasPagina.length === 0 && (
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
      {filteredFilas.length > FILAS_POR_PAGINA && (
        <div className="flex items-center justify-between gap-2 py-2 px-1 border-t bg-muted/30 rounded-b-lg shrink-0">
          <span className="text-sm text-muted-foreground tabular-nums">
            Mostrando {(paginaActual - 1) * FILAS_POR_PAGINA + 1}–
            {Math.min(paginaActual * FILAS_POR_PAGINA, filteredFilas.length)} de{" "}
            {filteredFilas.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium min-w-[7rem] text-center tabular-nums">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual >= totalPaginas}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
