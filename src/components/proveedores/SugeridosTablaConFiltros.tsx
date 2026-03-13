"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { fmtPrecio } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";
import type { ListaPreciosFiltradoOpciones } from "@/services/listaPrecios.service";

type FetchListaPreciosConOpcionesAction = (
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: ListaPreciosFiltradoOpciones
) => Promise<{
  filas: FilaListaPrecioParaCliente[];
  proveedoresDisponibles: { id: string; nombre: string; prefijo: string }[];
  marcasDisponibles: { id: string; nombre: string }[];
  rubrosDisponibles: { id: string; nombre: string }[];
}>;

interface ProveedorOption {
  id: string;
  nombre: string;
  prefijo: string;
}

interface MarcaOption {
  id: string;
  nombre: string;
}

interface SugeridosTablaConFiltrosProps {
  proveedores: ProveedorOption[];
  marcas: MarcaOption[];
  fetchListaPreciosConOpcionesAction: FetchListaPreciosConOpcionesAction;
}

const MIN_CARACTERES_BUSQUEDA = 3;
const MENSAJE_SIN_FILTRO =
  "Aplicá un filtro (Proveedor o Marca) o escribí al menos 3 caracteres en la búsqueda para ver productos.";

export default function SugeridosTablaConFiltros({
  proveedores,
  marcas,
  fetchListaPreciosConOpcionesAction,
}: SugeridosTablaConFiltrosProps) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [marcaNombre, setMarcaNombre] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [filasData, setFilasData] = useState<FilaListaPrecioParaCliente[]>([]);
  const [proveedoresOptions, setProveedoresOptions] = useState<ProveedorOption[]>(proveedores);
  const [marcasOptions, setMarcasOptions] = useState<MarcaOption[]>(marcas);
  const [loading, setLoading] = useState(false);

  const hasFilterActive =
    !!proveedorId || !!marcaNombre || busqueda.trim().length >= MIN_CARACTERES_BUSQUEDA;

  useEffect(() => {
    if (!hasFilterActive) {
      setProveedoresOptions(proveedores);
      setMarcasOptions(marcas);
    }
  }, [hasFilterActive, proveedores, marcas]);

  useEffect(() => {
    if (!hasFilterActive) {
      setFilasData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchListaPreciosConOpcionesAction(
      proveedorId || undefined,
      marcaNombre || undefined,
      undefined,
      busqueda.trim() || undefined,
      undefined,
      { soloPxSugerido: true }
    )
      .then((res) => {
        if (cancelled) return;
        setFilasData(res.filas);
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
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasFilterActive, proveedorId, marcaNombre, busqueda, fetchListaPreciosConOpcionesAction]);

  const filteredFilas = filasData;

  const hayFiltros = !!proveedorId || !!marcaNombre || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setMarcaNombre("");
    setBusqueda("");
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
                <SelectTrigger id="filtro-sugeridos-proveedor" className="input-filtro-unificado">
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
                <SelectTrigger id="filtro-sugeridos-marca" className="input-filtro-unificado">
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
          </FilaFiltrosDesplegables>
        </FilterRowSelection>
        <div className="flex items-center gap-3">
          <FilterRowSearch className="flex-1">
            <Input
              id="filtro-sugeridos-busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción (mín. 3 caracteres)"
              className="input-filtro-unificado"
            />
          </FilterRowSearch>
          <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
          <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
            {filteredFilas.length.toLocaleString()} PRODUCTO
            {filteredFilas.length !== 1 ? "S" : ""}
          </span>
        </div>
      </FilterBar>

      <div className="contenedor-tabla-gestion no-scroll-x no-scrollbar">
        <Table variant="compact" scrollX={false}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">COD. EXT.</TableHead>
              <TableHead className="min-w-0">DESCRIPCION PROVEEDOR</TableHead>
              <TableHead className="w-28">PX. VTA. SUGERIDO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasFilterActive && !loading && filteredFilas.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell className="celda-datos celda-mono whitespace-nowrap">
                  {fila.codExt}
                </TableCell>
                <TableCell className="celda-datos min-w-0 overflow-hidden align-top">
                  <div className="celda-destacado truncate text-xs font-bold">
                    {fila.descripcionProveedor}
                  </div>
                </TableCell>
                <TableCell className="celda-datos celda-numero celda-destacado">
                  ${fmtPrecio(Number(fila.pxVtaSugerido ?? 0))}
                </TableCell>
              </TableRow>
            ))}
            {(!hasFilterActive || loading || filteredFilas.length === 0) && (
              <TableRow>
                <TableCell
                  className="celda-datos py-8 text-muted-foreground text-center"
                  colSpan={3}
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
            : `Mostrando ${filteredFilas.length.toLocaleString()} de ${filteredFilas.length.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled>
            —
          </Button>
        </div>
      </div>
    </div>
  );
}
