"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import { fmtPrecio, fmtNumero } from "@/lib/format";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

/** Alto aproximado de una fila tbody (celda-datos). */
const BODY_ROW_HEIGHT_PX = 18;
/** Alto del thead (tabla-gestion-compacta). */
const HEADER_HEIGHT_PX = 16;

interface ProveedorOption {
  id: string;
  nombre: string;
  sufijo: string;
}

interface ListaPreciosTablaConFiltrosProps {
  filas: FilaListaPrecioParaCliente[];
  proveedores: ProveedorOption[];
}

export default function ListaPreciosTablaConFiltros({
  filas,
  proveedores,
}: ListaPreciosTablaConFiltrosProps) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const updateRowsPerPage = () => {
      const h = el.clientHeight;
      const bodyRows = Math.max(1, Math.floor((h - HEADER_HEIGHT_PX) / BODY_ROW_HEIGHT_PX));
      setRowsPerPage(bodyRows);
    };
    updateRowsPerPage();
    const ro = new ResizeObserver(updateRowsPerPage);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filteredFilas = useMemo(() => {
    let result = filas;
    if (proveedorId) {
      result = result.filter((f) => f.proveedor?.id === proveedorId);
    }
    if (busqueda.trim()) {
      result = result.filter((f) =>
        matchByMultiTerm([f.descripcionProveedor, f.descripcionTienda], busqueda)
      );
    }
    return result;
  }, [filas, proveedorId, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(filteredFilas.length / rowsPerPage)
  );
  const filasPagina = useMemo(() => {
    const desde = (paginaActual - 1) * rowsPerPage;
    return filteredFilas.slice(desde, desde + rowsPerPage);
  }, [filteredFilas, paginaActual, rowsPerPage]);

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
    <div className="flex flex-col h-full min-h-0 gap-0.5">
      <FilterBar className="gap-y-0.5 py-2">
        <FilterRowSelection>
          <div className="fila-filtros-5 grid grid-cols-5 gap-3 flex-1 min-w-0 items-center">
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={proveedorId || "none"}
                onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="filtro-proveedor" className="input-filtro-unificado">
                  <SelectValue placeholder="PROVEEDOR" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
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
        </FilterRowSelection>
        <div className="flex items-center gap-3">
          <FilterRowSearch>
            <Input
              id="filtro-lista-precios-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="BUSCAR POR DESCRIPCION"
              className="input-filtro-unificado"
            />
          </FilterRowSearch>
          <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
          <span className={`${FILTER_COUNT_CLASS} ml-auto`}>
            {filteredFilas.length.toLocaleString()} producto
            {filteredFilas.length !== 1 ? "s" : ""}
          </span>
        </div>
      </FilterBar>

      <div ref={tableContainerRef} className="contenedor-tabla-gestion">
        <table className="tabla-gestion-compacta">
          <thead>
            <tr>
              <th className="w-20">PROVEEDOR</th>
              <th className="w-28">COD. EXT.</th>
              <th className="min-w-0">DESCRIPCION</th>
              <th className="w-28">PX COMPRA FINAL</th>
              <th className="w-24">PX LISTA</th>
              <th className="w-20">DESC. PROD.</th>
              <th className="w-20">DESC. CANT.</th>
              <th className="w-24">CX. APROX TRANSPORTE</th>
            </tr>
          </thead>
          <tbody>
            {filasPagina.map((fila) => (
              <tr key={fila.id}>
                <td className="celda-datos celda-mono">
                  {fila.proveedor?.sufijo ?? "—"}
                </td>
                <td className="celda-datos celda-mono whitespace-nowrap">
                  {fila.codExt}
                </td>
                <td className="celda-datos min-w-0 overflow-hidden align-top">
                  <div className="celda-destacado truncate text-xs font-bold">
                    {fila.descripcionTienda && fila.descripcionTienda !== fila.descripcionProveedor
                      ? fila.descripcionTienda
                      : fila.descripcionProveedor}
                  </div>
                  {fila.descripcionTienda && fila.descripcionTienda !== fila.descripcionProveedor && (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {fila.descripcionProveedor}
                    </div>
                  )}
                </td>
                <td className="celda-datos celda-numero celda-destacado">
                  ${fmtPrecio(Number(fila.pxCompraFinal ?? 0))}
                </td>
                <td className="celda-datos celda-numero">
                  ${fmtPrecio(Number(fila.pxListaProveedor))}
                </td>
                <td className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoProducto)}%
                </td>
                <td className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoCantidad)}%
                </td>
                <td className="celda-datos celda-numero">
                  {fmtNumero(fila.cxAproxTransporte)}%
                </td>
              </tr>
            ))}
            {filasPagina.length === 0 && (
              <tr>
                <td
                  className="celda-datos py-1 text-muted-foreground text-center"
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
      <div className="flex items-center justify-between gap-2 py-1.5 px-1 border-t bg-muted/30 rounded-b-lg shrink-0">
        <span className="text-sm text-muted-foreground tabular-nums">
          {filteredFilas.length === 0
            ? "Mostrando 0 de 0"
            : `Mostrando ${(paginaActual - 1) * rowsPerPage + 1}–${Math.min(paginaActual * rowsPerPage, filteredFilas.length)} de ${filteredFilas.length.toLocaleString()}`}
        </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
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
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
    </div>
  );
}
