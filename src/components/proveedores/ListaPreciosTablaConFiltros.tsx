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
  FilaFiltrosDesplegables,
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

interface RubroOption {
  id: string;
  nombre: string;
}

type FetchListaPreciosConOpcionesAction = (
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined
) => Promise<{
  filas: FilaListaPrecioParaCliente[];
  proveedoresDisponibles: ProveedorOption[];
  marcasDisponibles: MarcaOption[];
  rubrosDisponibles: RubroOption[];
}>;

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
  fetchListaPreciosConOpcionesAction: FetchListaPreciosConOpcionesAction;
}

const MIN_CARACTERES_BUSQUEDA = 3;
const MENSAJE_SIN_FILTRO =
  "Aplicá un filtro (Proveedor, Marca, Rubro o Habilitado) o escribí al menos 3 caracteres en la búsqueda para ver productos.";

export default function ListaPreciosTablaConFiltros({
  proveedores,
  marcas,
  onFilteredIdsChange,
  fetchListaPreciosConOpcionesAction,
}: ListaPreciosTablaConFiltrosProps) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [marcaNombre, setMarcaNombre] = useState<string>("");
  const [rubroNombre, setRubroNombre] = useState<string>("");
  const [habilitadoFilter, setHabilitadoFilter] = useState<string>(""); // "" | "si" | "no"
  const [busqueda, setBusqueda] = useState("");
  const [filasData, setFilasData] = useState<FilaListaPrecioParaCliente[]>([]);
  const [proveedoresOptions, setProveedoresOptions] = useState<ProveedorOption[]>(proveedores);
  const [marcasOptions, setMarcasOptions] = useState<MarcaOption[]>(marcas);
  const [rubrosOptions, setRubrosOptions] = useState<RubroOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const hasFilterActive =
    !!proveedorId || !!marcaNombre || !!rubroNombre || habilitadoFilter === "si" || habilitadoFilter === "no" || (busqueda.trim().length >= MIN_CARACTERES_BUSQUEDA);

  useEffect(() => {
    if (!hasFilterActive) {
      setProveedoresOptions(proveedores);
      setMarcasOptions(marcas);
      setRubrosOptions([]);
    }
  }, [hasFilterActive, proveedores, marcas]);

  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const updateRowsPerPage = () => {
      const h = el.clientHeight;
      const bodyRows = Math.max(
        1,
        Math.floor((h - HEADER_HEIGHT_PX) / BODY_ROW_HEIGHT_PX) - 1
      );
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
    fetchListaPreciosConOpcionesAction(
      proveedorId || undefined,
      marcaNombre || undefined,
      rubroNombre || undefined,
      busqueda.trim() || undefined,
      habilitadoFilter === "si" ? true : habilitadoFilter === "no" ? false : undefined
    )
      .then((res) => {
        if (cancelled) return;
        setFilasData(res.filas);
        onFilteredIdsChange?.(res.filas.map((f) => f.id));
        setProveedoresOptions((prev) => {
          const next = res.proveedoresDisponibles;
          const selected = prev.find((p) => p.id === proveedorId);
          if (proveedorId && selected && !next.some((p) => p.id === proveedorId)) {
            return [selected, ...next];
          }
          return next;
        });
        setMarcasOptions((prev) => {
          const next = res.marcasDisponibles;
          const selected = prev.find((m) => m.nombre === marcaNombre);
          if (marcaNombre && selected && !next.some((m) => m.nombre === marcaNombre)) {
            return [selected, ...next];
          }
          return next;
        });
        setRubrosOptions((prev) => {
          const next = res.rubrosDisponibles;
          const selected = prev.find((r) => r.nombre === rubroNombre);
          if (rubroNombre && selected && !next.some((r) => r.nombre === rubroNombre)) {
            return [selected, ...next];
          }
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    hasFilterActive,
    proveedorId,
    marcaNombre,
    rubroNombre,
    habilitadoFilter,
    busqueda,
    fetchListaPreciosConOpcionesAction,
    onFilteredIdsChange,
  ]);

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
  }, [proveedorId, marcaNombre, rubroNombre, busqueda]);

  useEffect(() => {
    if (totalPaginas > 0 && paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  const hayFiltros = !!proveedorId || !!marcaNombre || !!rubroNombre || !!habilitadoFilter || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setMarcaNombre("");
    setRubroNombre("");
    setHabilitadoFilter("");
    setBusqueda("");
    setPaginaActual(1);
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-0.5">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
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
                  {proveedoresOptions.map((p) => (
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
                  {marcasOptions.map((m) => (
                    <SelectItem key={m.id} value={m.nombre}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={rubroNombre || "none"}
                onValueChange={(v) => setRubroNombre(v === "none" ? "" : v)}
              >
                <SelectTrigger id="filtro-rubro" className="input-filtro-unificado">
                  <SelectValue placeholder="RUBRO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="none">RUBRO</SelectItem>
                  {rubrosOptions.map((r) => (
                    <SelectItem key={r.id} value={r.nombre}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={habilitadoFilter || "none"}
                onValueChange={(v) => setHabilitadoFilter(v === "none" ? "" : v)}
              >
                <SelectTrigger id="filtro-habilitado" className="input-filtro-unificado">
                  <SelectValue placeholder="HABILITADO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="none">HABILITADO</SelectItem>
                  <SelectItem value="si">HABILITADO</SelectItem>
                  <SelectItem value="no">NO HABILITADO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FilaFiltrosDesplegables>
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

      <div ref={tableContainerRef} className="contenedor-tabla-gestion no-scroll-x no-scrollbar">
        <Table variant="compact" scrollX={false}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20">COD. EXT.</TableHead>
              <TableHead className="w-20">MARCA</TableHead>
              <TableHead className="w-20">RUBRO</TableHead>
              <TableHead className="min-w-0">DESCRIPCION</TableHead>
              <TableHead className="w-28">PX FINAL COMPRA</TableHead>
              <TableHead className="w-16">DESC. PROV.</TableHead>
              <TableHead className="w-16">DESC. MARCA</TableHead>
              <TableHead className="w-16">DESC. RUBRO</TableHead>
              <TableHead className="w-16">DESC. CANT.</TableHead>
              <TableHead className="w-16">DESC. FINAN.</TableHead>
              <TableHead className="w-16">CX. TRANSP.</TableHead>
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
                <TableCell className="celda-datos">
                  {fila.rubro ?? "—"}
                </TableCell>
                <TableCell className="celda-datos min-w-0 overflow-hidden align-top">
                  <div className="celda-destacado truncate text-xs font-bold">
                    {fila.descripcionProveedor}
                  </div>
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
                  {fmtNumero(fila.dtoRubro)}%
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
                  colSpan={11}
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
      <div className="flex items-center justify-between gap-2 py-1.5 px-1 border-t bg-gris rounded-b-lg shrink-0">
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
