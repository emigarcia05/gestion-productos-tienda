"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import PaginacionClient from "@/components/shared/PaginacionClient";
import { fmtPrecio, fmtNumero } from "@/lib/format";
import {
  tableEmptyStateContainerVariants,
  tableEmptyStateMessageVariants,
} from "@/components/shared/TableEmptyState";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import EdicionMasivaListaPreciosModal from "@/components/proveedores/EdicionMasivaListaPreciosModal";
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
  habilitado: boolean | undefined,
  opciones?: { soloPxSugerido?: boolean },
  pagina?: number
) => Promise<{
  filas: FilaListaPrecioParaCliente[];
  total: number;
  totalPaginas: number;
  proveedoresDisponibles: ProveedorOption[];
  marcasDisponibles: MarcaOption[];
  rubrosDisponibles: RubroOption[];
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

interface ListaPreciosTablaConFiltrosProps {
  proveedores: ProveedorOption[];
  marcas: MarcaOption[];
  rubros: RubroOption[];
  puedeEdicionMasiva?: boolean;
  reloadNonce?: number;
  onEdicionSuccess?: () => void;
  onFilteredIdsChange?: (ids: string[]) => void;
  fetchListaPreciosConOpcionesAction: FetchListaPreciosConOpcionesAction;
}

const MIN_CARACTERES_BUSQUEDA = 3;
const MENSAJE_SIN_FILTRO =
  "Aplicá un filtro (Proveedor, Marca, Rubro o Habilitado) o escribí al menos 3 caracteres en la búsqueda para ver productos.";

export default function ListaPreciosTablaConFiltros({
  proveedores,
  marcas,
  rubros,
  puedeEdicionMasiva = false,
  reloadNonce = 0,
  onEdicionSuccess,
  onFilteredIdsChange,
  fetchListaPreciosConOpcionesAction,
}: ListaPreciosTablaConFiltrosProps) {
  const [filaEdit, setFilaEdit] = useState<FilaListaPrecioParaCliente | null>(null);
  const [editOpen, setEditOpen] = useState(false);
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
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const hasFilterActive =
    !!proveedorId || !!marcaNombre || !!rubroNombre || habilitadoFilter === "si" || habilitadoFilter === "no" || (busqueda.trim().length >= MIN_CARACTERES_BUSQUEDA);

  useEffect(() => {
    if (!hasFilterActive) {
      queueMicrotask(() => {
        setProveedoresOptions(proveedores);
        setMarcasOptions(marcas);
        setRubrosOptions([]);
      });
    }
  }, [hasFilterActive, proveedores, marcas]);

  useEffect(() => {
    if (!hasFilterActive) {
      queueMicrotask(() => {
        setFilasData([]);
        setTotal(0);
        setTotalPaginas(1);
        onFilteredIdsChange?.([]);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    fetchListaPreciosConOpcionesAction(
      proveedorId || undefined,
      marcaNombre || undefined,
      rubroNombre || undefined,
      busqueda.trim() || undefined,
      habilitadoFilter === "si" ? true : habilitadoFilter === "no" ? false : undefined,
      undefined,
      pagina
    )
      .then((res) => {
        if (cancelled) return;
        setFilasData(res.filas);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas);
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
    pagina,
    fetchListaPreciosConOpcionesAction,
    onFilteredIdsChange,
    reloadNonce,
  ]);

  useEffect(() => {
    queueMicrotask(() => setPagina(1));
  }, [proveedorId, marcaNombre, rubroNombre, habilitadoFilter, busqueda]);

  const filteredFilas = filasData;

  const hayFiltros = !!proveedorId || !!marcaNombre || !!rubroNombre || !!habilitadoFilter || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setMarcaNombre("");
    setRubroNombre("");
    setHabilitadoFilter("");
    setBusqueda("");
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-0.5">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select
                value={proveedorId || undefined}
                onValueChange={(v) => setProveedorId(v)}
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
                value={marcaNombre || undefined}
                onValueChange={(v) => setMarcaNombre(v)}
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
                value={rubroNombre || undefined}
                onValueChange={(v) => setRubroNombre(v)}
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
                value={habilitadoFilter || undefined}
                onValueChange={(v) => setHabilitadoFilter(v)}
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
              placeholder="BUSCAR POR DESCRIPCIÓN (MÍN. 3 CARACTERES)"
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

      <div className="contenedor-tabla-gestion no-scroll-x">
        <Table variant="compact" scrollX={false}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-20">COD. EXT.</TableHead>
              <TableHead className="min-w-0">DESCRIPCION</TableHead>
              <TableHead className="w-28">PX. FINAL</TableHead>
              <TableHead className="w-16">DESC. PROV.</TableHead>
              <TableHead className="w-16">DESC. MARCA</TableHead>
              <TableHead className="w-16">DESC. RUBRO</TableHead>
              <TableHead className="w-16">DESC. CANT.</TableHead>
              <TableHead className="w-16">DESC. FINAN.</TableHead>
              <TableHead className="w-16">CX. TRANSP.</TableHead>
              {puedeEdicionMasiva && (
                <TableHead className="w-14 text-center">ACCIONES</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasFilterActive && !loading && filteredFilas.map((fila) => (
              <TableRow key={fila.id}>
                <TableCell className="celda-datos celda-mono whitespace-nowrap">
                  {fila.codExt}
                </TableCell>
                <TableCell className="celda-datos min-w-0 overflow-hidden">
                  <div className="celda-destacado truncate text-xs font-bold">
                    {fila.descripcionProveedor}
                  </div>
                </TableCell>
                <TableCell className="celda-datos celda-numero celda-destacado">
                  ${fmtPrecio(Number(fila.pxCompraFinalSinIva ?? 0))}
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
                {puedeEdicionMasiva && (
                  <TableCell className="celda-datos celda-datos--accion-relleno-fila p-0">
                    <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                        aria-label={`Editar ${fila.codExt}`}
                        onClick={() => {
                          setFilaEdit(fila);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!hasFilterActive || loading || filteredFilas.length === 0) && (
              <TableRow>
                <TableCell
                  className={cn(
                    "celda-datos",
                    tableEmptyStateContainerVariants({
                      placement: "tableCell",
                      textSize: "sm",
                    })
                  )}
                  colSpan={puedeEdicionMasiva ? 10 : 9}
                >
                  <span
                    className={tableEmptyStateMessageVariants({
                      maxWidth: "full",
                    })}
                  >
                    {!hasFilterActive
                      ? MENSAJE_SIN_FILTRO
                      : loading
                        ? "Cargando…"
                        : "Ningún producto coincide con los filtros."}
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {puedeEdicionMasiva && (
        <EdicionMasivaListaPreciosModal
          mode="fila"
          fila={filaEdit}
          open={editOpen}
          onOpenChange={(next) => {
            setEditOpen(next);
            if (!next) setFilaEdit(null);
          }}
          marcas={marcas}
          rubros={rubros}
          onSuccess={onEdicionSuccess}
        />
      )}

      <div className="flex items-center justify-between gap-2 py-1.5 px-1 border-t bg-gris rounded-b-lg shrink-0">
        <span className="text-sm text-muted-foreground tabular-nums">
          {!hasFilterActive || total === 0
            ? "Mostrando 0 de 0"
            : `Mostrando ${filteredFilas.length.toLocaleString()} de ${total.toLocaleString()}`}
        </span>
        {hasFilterActive && totalPaginas > 1 && (
          <PaginacionClient
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            onPaginaChange={setPagina}
          />
        )}
      </div>
    </div>
  );
}
