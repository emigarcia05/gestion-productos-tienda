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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtPrecio, fmtNumero } from "@/lib/format";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

type FetchListaPreciosAction = (
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  busqueda: string | undefined
) => Promise<FilaListaPrecioParaCliente[]>;

/** Alto aproximado de una fila tbody (celda-datos). */
const BODY_ROW_HEIGHT_PX = 28;
/** Alto del thead (Table variant="compact"): 3.5rem en globals.css. */
const HEADER_HEIGHT_PX = 56;

interface ProveedorOption {
  id: string;
  nombre: string;
  prefijo: string;
}

interface MarcaOption {
  id: string;
  nombre: string;
}

interface ListaPreciosTablaConFiltrosProps {
  proveedores: ProveedorOption[];
  marcas: MarcaOption[];
  onFilteredIdsChange?: (ids: string[]) => void;
  fetchListaPreciosAction: FetchListaPreciosAction;
}

const MIN_CARACTERES_BUSQUEDA = 3;
const MENSAJE_SIN_FILTRO =
  "Aplicá un filtro (Proveedor o Marca) o escribí al menos 3 caracteres en la búsqueda para ver productos.";

export default function ListaPreciosTablaConFiltros({
  proveedores,
  marcas,
  onFilteredIdsChange,
  fetchListaPreciosAction,
}: ListaPreciosTablaConFiltrosProps) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [marcaNombre, setMarcaNombre] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [filasData, setFilasData] = useState<FilaListaPrecioParaCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const hasFilterActive =
    !!proveedorId || !!marcaNombre || (busqueda.trim().length >= MIN_CARACTERES_BUSQUEDA);

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

  useEffect(() => {
    if (!hasFilterActive) {
      setFilasData([]);
      onFilteredIdsChange?.([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchListaPreciosAction(
      proveedorId || undefined,
      marcaNombre || undefined,
      busqueda.trim() || undefined
    )
      .then((data) => {
        if (!cancelled) {
          setFilasData(data);
          onFilteredIdsChange?.(data.map((f) => f.id));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasFilterActive, proveedorId, marcaNombre, busqueda, fetchListaPreciosAction, onFilteredIdsChange]);

  const filteredFilas = filasData;

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
  }, [proveedorId, marcaNombre, busqueda]);

  useEffect(() => {
    if (totalPaginas > 0 && paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  const hayFiltros = !!proveedorId || !!marcaNombre || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setMarcaNombre("");
    setBusqueda("");
    setPaginaActual(1);
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-0.5">
      <FilterBar className="filtros-contenedor-tienda bg-white">
        <FilterRowSelection>
          <div className="fila-filtros-5 grid grid-cols-5 gap-3 w-full">
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
                value={marcaNombre || "none"}
                onValueChange={(v) => setMarcaNombre(v === "none" ? "" : v)}
              >
                <SelectTrigger id="filtro-marca" className="input-filtro-unificado">
                  <SelectValue placeholder="MARCA" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="none">MARCA</SelectItem>
                  {marcas.map((m) => (
                    <SelectItem key={m.id} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FilterRowSelection>
        <div className="flex items-center gap-3">
          <FilterRowSearch className="flex-1">
            <Input
              id="filtro-lista-precios-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción (mín. 3 caracteres)"
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

      <div ref={tableContainerRef} className="contenedor-tabla-gestion no-scroll-x">
        <Table variant="compact" scrollX={false}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">COD. EXT.</TableHead>
              <TableHead className="w-24">MARCA</TableHead>
              <TableHead className="min-w-0">DESCRIPCION</TableHead>
              <TableHead className="w-28">PX FINAL COMPRA</TableHead>
              <TableHead className="w-20">DESC. PROVEEDOR</TableHead>
              <TableHead className="w-20">DESC. MARCA</TableHead>
              <TableHead className="w-20">DESC. PROD.</TableHead>
              <TableHead className="w-20">DESC. CANT.</TableHead>
              <TableHead className="w-20">DESC. FINAN.</TableHead>
              <TableHead className="w-24">CX. APRO. TRANSPORTE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasFilterActive && !loading && filasPagina.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell className="celda-datos celda-mono whitespace-nowrap">
                  {fila.codExt}
                </TableCell>
                <TableCell className="celda-datos">
                  {fila.marca ?? "—"}
                </TableCell>
                <TableCell className="celda-datos min-w-0 overflow-hidden align-top">
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
                </TableCell>
                <TableCell className="celda-datos celda-numero celda-destacado">
                  ${fmtPrecio(Number(fila.pxCompraFinal ?? 0))}
                </TableCell>
                <TableCell className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoProveedor)}%
                </TableCell>
                <TableCell className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoMarca)}%
                </TableCell>
                <TableCell className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoProducto)}%
                </TableCell>
                <TableCell className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoCantidad)}%
                </TableCell>
                <TableCell className="celda-datos celda-numero">
                  {fmtNumero(fila.dtoFinanciero)}%
                </TableCell>
                <TableCell className="celda-datos celda-numero">
                  {fmtNumero(fila.cxTransporte)}%
                </TableCell>
              </TableRow>
            ))}
            {(!hasFilterActive || loading || filasPagina.length === 0) && (
              <TableRow>
                <TableCell
                  className="celda-datos py-8 text-muted-foreground text-center"
                  colSpan={10}
                >
                  {!hasFilterActive
                    ? MENSAJE_SIN_FILTRO
                    : loading
                      ? "Cargando…"
                      : "Ningún producto coincide con los filtros."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
