"use client";

import { Fragment, useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
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
  TABLE_ROW_ACTION_ICON_CLASS,
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

const SUBFILA_DETALLE_CLASS = "tabla-fila-detalle-competencia";
const SUBFILA_CELDA_BLOQUE_CLASS = "tabla-fila-detalle-competencia-celda";
const SUBFILA_CELDA_HUECA_CLASS = "tabla-fila-detalle-competencia-hueca";

function fmtPorcentajeTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${fmtNumero(n)}%`;
}

function fmtPrecioTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${fmtPrecio(n)}`;
}

function DescripcionCelda({ fila }: { fila: FilaListaPrecioParaCliente }) {
  const tienda = fila.descripcionTienda?.trim() || "";
  const proveedor = fila.descripcionProveedor?.trim() || "";
  const principal = tienda || proveedor || "—";
  const secundaria =
    tienda && proveedor && tienda !== proveedor ? proveedor : null;
  const meta = [fila.marca, fila.rubro].filter(Boolean).join(" · ");

  const titleParts = [principal, secundaria, meta, fila.codExt].filter(Boolean).join(" · ");

  return (
    <div className="min-w-0 flex flex-col gap-0.5" title={titleParts}>
      <div className="celda-destacado truncate text-xs font-bold">{principal}</div>
      {secundaria ? (
        <div className="truncate text-[0.6875rem] text-muted-foreground">{secundaria}</div>
      ) : null}
      {meta ? (
        <div className="truncate text-[0.6875rem] text-muted-foreground">{meta}</div>
      ) : null}
    </div>
  );
}

function DetalleDescuentosFila({
  fila,
  showProveedor,
  conColumnaAcciones,
}: {
  fila: FilaListaPrecioParaCliente;
  showProveedor: boolean;
  conColumnaAcciones: boolean;
}) {
  const items: { label: string; value: string }[] = [
    { label: "DESC. PROV.", value: fmtPorcentajeTabla(fila.dtoProveedor) },
    { label: "DESC. MARCA", value: fmtPorcentajeTabla(fila.dtoMarca) },
    { label: "DESC. RUBRO", value: fmtPorcentajeTabla(fila.dtoRubro) },
    { label: "DESC. CANT.", value: fmtPorcentajeTabla(fila.dtoCantidad) },
    { label: "DESC. FINAN.", value: fmtPorcentajeTabla(fila.dtoFinanciero) },
    { label: "CX. TRANSP.", value: fmtPorcentajeTabla(fila.cxTransporte) },
  ];

  const colsDetalle = 4;

  return (
    <TableRow
      className={cn(SUBFILA_DETALLE_CLASS, "tabla-fila-detalle-competencia--cierre", "hover:bg-transparent")}
    >
      <TableCell className={cn("celda-datos", SUBFILA_CELDA_HUECA_CLASS)} aria-hidden />
      {showProveedor ? (
        <TableCell className={cn("celda-datos", SUBFILA_CELDA_HUECA_CLASS)} aria-hidden />
      ) : null}
      <TableCell colSpan={colsDetalle} className={cn("celda-datos", SUBFILA_CELDA_BLOQUE_CLASS)}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
          {items.map(({ label, value }) => (
            <span key={label} className="tabular-nums whitespace-nowrap">
              <span className="font-semibold text-foreground">{label}</span>{" "}
              <span className="text-foreground">{value}</span>
            </span>
          ))}
        </div>
      </TableCell>
      {conColumnaAcciones ? (
        <TableCell className={cn("celda-datos", SUBFILA_CELDA_HUECA_CLASS)} aria-hidden />
      ) : null}
    </TableRow>
  );
}

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
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const [proveedorId, setProveedorId] = useState<string>("");
  const [marcaNombre, setMarcaNombre] = useState<string>("");
  const [rubroNombre, setRubroNombre] = useState<string>("");
  const [habilitadoFilter, setHabilitadoFilter] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [filasData, setFilasData] = useState<FilaListaPrecioParaCliente[]>([]);
  const [proveedoresOptions, setProveedoresOptions] = useState<ProveedorOption[]>(proveedores);
  const [marcasOptions, setMarcasOptions] = useState<MarcaOption[]>(marcas);
  const [rubrosOptions, setRubrosOptions] = useState<RubroOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const showProveedorColumn = !proveedorId;
  const colCount =
    5 + (showProveedorColumn ? 1 : 0) + (puedeEdicionMasiva ? 1 : 0);

  const hasFilterActive =
    !!proveedorId ||
    !!marcaNombre ||
    !!rubroNombre ||
    habilitadoFilter === "si" ||
    habilitadoFilter === "no" ||
    busqueda.trim().length >= MIN_CARACTERES_BUSQUEDA;

  function toggleDetalle(codExt: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(codExt)) next.delete(codExt);
      else next.add(codExt);
      return next;
    });
  }

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
        setExpandidos(new Set());
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
    queueMicrotask(() => {
      setPagina(1);
      setExpandidos(new Set());
    });
  }, [proveedorId, marcaNombre, rubroNombre, habilitadoFilter, busqueda]);

  const filteredFilas = filasData;
  const hayFiltros =
    !!proveedorId || !!marcaNombre || !!rubroNombre || !!habilitadoFilter || !!busqueda.trim();

  function limpiarFiltros() {
    setProveedorId("");
    setMarcaNombre("");
    setRubroNombre("");
    setHabilitadoFilter("");
    setBusqueda("");
    setExpandidos(new Set());
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-0.5">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
            <div className={FILTER_SELECT_WRAPPER_CLASS}>
              <Select value={proveedorId || undefined} onValueChange={(v) => setProveedorId(v)}>
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
              <Select value={marcaNombre || undefined} onValueChange={(v) => setMarcaNombre(v)}>
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
              <Select value={rubroNombre || undefined} onValueChange={(v) => setRubroNombre(v)}>
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
              <Select value={habilitadoFilter || undefined} onValueChange={(v) => setHabilitadoFilter(v)}>
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
          <colgroup>
            <col className="w-[5rem]" />
            {showProveedorColumn ? <col className="w-[3.25rem]" /> : null}
            <col />
            <col className="w-[6.75rem]" />
            <col className="w-[6.75rem]" />
            <col className="w-[3.25rem]" />
            {puedeEdicionMasiva ? <col className="w-[3.25rem]" /> : null}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>COD. EXT.</TableHead>
              {showProveedorColumn ? <TableHead>PROV.</TableHead> : null}
              <TableHead>DESCRIPCION</TableHead>
              <TableHead className="text-right">PX. LISTA PROV.</TableHead>
              <TableHead className="text-right">PX. FINAL</TableHead>
              <TableHead className="text-center">DET.</TableHead>
              {puedeEdicionMasiva ? (
                <TableHead className="text-center">ACCIONES</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasFilterActive &&
              !loading &&
              filteredFilas.map((fila) => {
                const expandido = expandidos.has(fila.id);
                return (
                  <Fragment key={fila.id}>
                    <TableRow>
                      <TableCell className="celda-datos celda-mono whitespace-nowrap">
                        {fila.codExt}
                      </TableCell>
                      {showProveedorColumn ? (
                        <TableCell
                          className="celda-datos celda-mono text-center font-semibold whitespace-nowrap"
                          title={fila.proveedor?.nombre}
                        >
                          {fila.proveedor?.prefijo || "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="celda-datos min-w-0 overflow-hidden align-top">
                        <DescripcionCelda fila={fila} />
                      </TableCell>
                      <TableCell className="celda-datos celda-numero celda-destacado text-right whitespace-nowrap">
                        {fmtPrecioTabla(fila.pxListaProveedor)}
                      </TableCell>
                      <TableCell
                        className="celda-datos celda-numero celda-destacado text-right whitespace-nowrap"
                        title="Precio compra final sin IVA"
                      >
                        {fmtPrecioTabla(fila.pxCompraFinalSinIva)}
                      </TableCell>
                      <TableCell className="celda-datos celda-datos--accion-relleno-fila p-0">
                        <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={expandido ? "Ocultar descuentos" : "Ver descuentos"}
                            aria-expanded={expandido}
                            onClick={() => toggleDetalle(fila.id)}
                          >
                            {expandido ? (
                              <ChevronUp className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            ) : (
                              <ChevronDown className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      {puedeEdicionMasiva ? (
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
                      ) : null}
                    </TableRow>
                    {expandido ? (
                      <DetalleDescuentosFila
                        fila={fila}
                        showProveedor={showProveedorColumn}
                        conColumnaAcciones={puedeEdicionMasiva}
                      />
                    ) : null}
                  </Fragment>
                );
              })}
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
                  colSpan={colCount}
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
