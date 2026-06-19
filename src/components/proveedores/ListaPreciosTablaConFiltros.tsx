"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FiltroIndividualContainer,
  FilterRowSelection,
  FilterRowSearch,
  FilaFiltrosDesplegables,
  FILTER_SELECT_WRAPPER_CLASS,
  FILTER_COUNT_CLASS,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PaginacionClient from "@/components/shared/PaginacionClient";
import { fmtPrecio, fmtPorcentajeTabla } from "@/lib/format";
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
import VincularPrecioRexModal from "@/components/proveedores/VincularPrecioRexModal";
import EliminarListaPrecioModal from "@/components/proveedores/EliminarListaPrecioModal";
import SublineaDescuentosListaPrecios from "@/components/proveedores/SublineaDescuentosListaPrecios";
import ReglaDescuentoItemListaPreciosModal from "@/components/proveedores/ReglaDescuentoItemListaPreciosModal";
import type { ListaPreciosFiltrosExportSnapshot } from "@/components/proveedores/ExportarListaPreciosButton";
import type {
  DescuentoActivoListaPrecio,
  FilaListaPrecioParaCliente,
} from "@/services/listaPrecios.service";
import {
  getListaPreciosConOpcionesAction,
  type ListaPreciosFiltrosLecturaInput,
} from "@/actions/listaPrecios";
import { toast } from "sonner";

interface ProveedorOption {
  id: string;
  nombre: string;
  prefijo: string;
}

interface MarcaOption {
  id: string;
  nombre: string;
}

interface RubroOption {
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
  onFiltrosExportSnapshotChange?: (snapshot: ListaPreciosFiltrosExportSnapshot) => void;
}

const MIN_CARACTERES_BUSQUEDA = 3;
const MENSAJE_SIN_FILTRO =
  "Aplicá un filtro (Proveedor, Marca, Rubro, Habilitado o Vinculado) o escribí al menos 3 caracteres en la búsqueda para ver productos.";

function fmtPrecioTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${fmtPrecio(n)}`;
}

function DescripcionCelda({
  fila,
  modoDescuentosInline,
  onVerRegla,
}: {
  fila: FilaListaPrecioParaCliente;
  modoDescuentosInline: boolean;
  onVerRegla: (descuento: DescuentoActivoListaPrecio, codExt: string) => void;
}) {
  const tienda = fila.descripcionTienda?.trim() || "";
  const proveedor = fila.descripcionProveedor?.trim() || "";
  const principal = tienda || proveedor || "—";
  const marca = fila.marca?.trim() || "";
  const titleParts = [
    principal,
    marca,
    modoDescuentosInline
      ? [
          marca,
          ...(fila.descuentosActivos ?? []).map(
            (d) => `${d.label} ${fmtPorcentajeTabla(d.valor)}`
          ),
        ]
          .filter(Boolean)
          .join(" · ")
      : "",
    fila.codExt,
  ].filter(Boolean);

  return (
    <div
      className="flex min-w-0 max-h-full flex-col justify-center gap-0"
      title={titleParts.join(" · ")}
    >
      <div className="celda-destacado truncate text-xs font-bold leading-none">{principal}</div>
      {modoDescuentosInline ? (
        <SublineaDescuentosListaPrecios
          fila={fila}
          marca={marca}
          onVerRegla={onVerRegla}
        />
      ) : marca ? (
        <div className="celda-sublinea-tabla truncate leading-none" title={marca}>
          {marca}
        </div>
      ) : null}
    </div>
  );
}

export default function ListaPreciosTablaConFiltros({
  proveedores,
  marcas,
  rubros,
  puedeEdicionMasiva = false,
  reloadNonce = 0,
  onEdicionSuccess,
  onFiltrosExportSnapshotChange,
}: ListaPreciosTablaConFiltrosProps) {
  const [filaEdit, setFilaEdit] = useState<FilaListaPrecioParaCliente | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [filaVincular, setFilaVincular] = useState<FilaListaPrecioParaCliente | null>(null);
  const [vincularOpen, setVincularOpen] = useState(false);
  const [filaEliminar, setFilaEliminar] = useState<FilaListaPrecioParaCliente | null>(null);
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [modoDescuentosInline, setModoDescuentosInline] = useState(false);
  const [reglaModalOpen, setReglaModalOpen] = useState(false);
  const [reglaModalDescuento, setReglaModalDescuento] =
    useState<DescuentoActivoListaPrecio | null>(null);
  const [reglaModalCodExt, setReglaModalCodExt] = useState<string | undefined>(undefined);
  const [proveedorId, setProveedorId] = useState<string>("");
  const [marcaNombre, setMarcaNombre] = useState<string>("");
  const [rubroNombre, setRubroNombre] = useState<string>("");
  const [habilitadoFilter, setHabilitadoFilter] = useState<string>("");
  const [vinculadoFilter, setVinculadoFilter] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [filasData, setFilasData] = useState<FilaListaPrecioParaCliente[]>([]);
  const [proveedoresOptions, setProveedoresOptions] = useState<ProveedorOption[]>(proveedores);
  const [marcasOptions, setMarcasOptions] = useState<MarcaOption[]>(marcas);
  const [rubrosOptions, setRubrosOptions] = useState<RubroOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const busquedaInputRef = useRef<HTMLInputElement>(null);

  const showProveedorColumn = !proveedorId;
  const colCount = 5 + (showProveedorColumn ? 1 : 0);

  const hasFilterActive =
    !!proveedorId ||
    !!marcaNombre ||
    !!rubroNombre ||
    habilitadoFilter === "si" ||
    habilitadoFilter === "no" ||
    vinculadoFilter === "si" ||
    vinculadoFilter === "no" ||
    busqueda.trim().length >= MIN_CARACTERES_BUSQUEDA;

  function toggleModoDescuentosInline() {
    setModoDescuentosInline((prev) => !prev);
  }

  function abrirReglaDescuento(descuento: DescuentoActivoListaPrecio, codExt: string) {
    setReglaModalDescuento(descuento);
    setReglaModalCodExt(codExt);
    setReglaModalOpen(true);
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

  function reiniciarPagina() {
    setPagina(1);
  }

  function cambiarProveedor(value: string) {
    setProveedorId(value);
    reiniciarPagina();
  }

  function cambiarMarca(value: string) {
    setMarcaNombre(value);
    reiniciarPagina();
  }

  function cambiarRubro(value: string) {
    setRubroNombre(value);
    reiniciarPagina();
  }

  function cambiarHabilitado(value: string) {
    setHabilitadoFilter(value);
    reiniciarPagina();
  }

  function cambiarVinculado(value: string) {
    setVinculadoFilter(value);
    reiniciarPagina();
  }

  function cambiarBusqueda(value: string) {
    setBusqueda(value);
    reiniciarPagina();
  }

  useEffect(() => {
    if (!hasFilterActive) {
      queueMicrotask(() => {
        setLoading(false);
        setFilasData([]);
        setTotal(0);
        setTotalPaginas(1);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    const params: ListaPreciosFiltrosLecturaInput = {
      proveedorId: proveedorId || undefined,
      marcaNombre: marcaNombre || undefined,
      rubroNombre: rubroNombre || undefined,
      busqueda: busqueda.trim() || undefined,
      habilitado: habilitadoFilter === "si" ? true : habilitadoFilter === "no" ? false : undefined,
      vinculado: vinculadoFilter === "si" ? true : vinculadoFilter === "no" ? false : undefined,
      pagina,
    };
    getListaPreciosConOpcionesAction(params)
      .then((res) => {
        if (cancelled || !res) return;
        setFilasData(res.filas);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas);
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
      .catch(() => {
        if (cancelled) return;
        toast.error("Error al cargar la lista de precios.");
        setFilasData([]);
        setTotal(0);
        setTotalPaginas(1);
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
    vinculadoFilter,
    busqueda,
    pagina,
    reloadNonce,
  ]);

  useEffect(() => {
    onFiltrosExportSnapshotChange?.({
      hasFilterActive,
      total: hasFilterActive ? total : 0,
      filtros: hasFilterActive
        ? {
            proveedorId: proveedorId || undefined,
            marcaNombre: marcaNombre || undefined,
            rubroNombre: rubroNombre || undefined,
            busqueda: busqueda.trim() || undefined,
            habilitado:
              habilitadoFilter === "si" ? true : habilitadoFilter === "no" ? false : undefined,
            vinculado:
              vinculadoFilter === "si" ? true : vinculadoFilter === "no" ? false : undefined,
          }
        : null,
    });
  }, [
    hasFilterActive,
    proveedorId,
    marcaNombre,
    rubroNombre,
    habilitadoFilter,
    vinculadoFilter,
    busqueda,
    total,
    onFiltrosExportSnapshotChange,
  ]);

  const filteredFilas = filasData;

  function limpiarFiltros() {
    setProveedorId("");
    setMarcaNombre("");
    setRubroNombre("");
    setHabilitadoFilter("");
    setVinculadoFilter("");
    setBusqueda("");
    setPagina(1);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-0.5">
      <FilterBar className="filtros-contenedor-tienda bg-card">
        <FilterRowSelection>
          <FilaFiltrosDesplegables>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(proveedorId)}
              onLimpiar={() => cambiarProveedor("")}
            >
              <Select value={proveedorId || undefined} onValueChange={cambiarProveedor}>
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
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(marcaNombre)}
              onLimpiar={() => cambiarMarca("")}
            >
              <Select value={marcaNombre || undefined} onValueChange={cambiarMarca}>
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
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={Boolean(rubroNombre)}
              onLimpiar={() => cambiarRubro("")}
            >
              <Select value={rubroNombre || undefined} onValueChange={cambiarRubro}>
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
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={habilitadoFilter === "si" || habilitadoFilter === "no"}
              onLimpiar={() => cambiarHabilitado("")}
            >
              <Select value={habilitadoFilter || undefined} onValueChange={cambiarHabilitado}>
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
            </FiltroIndividualContainer>
            <FiltroIndividualContainer
              className={FILTER_SELECT_WRAPPER_CLASS}
              activo={vinculadoFilter === "si" || vinculadoFilter === "no"}
              onLimpiar={() => cambiarVinculado("")}
            >
              <Select value={vinculadoFilter || undefined} onValueChange={cambiarVinculado}>
                <SelectTrigger id="filtro-vinculado" className="input-filtro-unificado">
                  <SelectValue placeholder="VINCULADO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  <SelectItem value="si">SI</SelectItem>
                  <SelectItem value="no">NO</SelectItem>
                </SelectContent>
              </Select>
            </FiltroIndividualContainer>
          </FilaFiltrosDesplegables>
        </FilterRowSelection>
        <div className="flex items-center gap-3">
          <FilterRowSearch className="flex-1">
            <FiltroBusquedaInput
              id="filtro-lista-precios-busqueda"
              value={busqueda}
              onChange={cambiarBusqueda}
              isDebouncing={loading && busqueda.trim().length > 0}
              inputRef={busquedaInputRef}
              placeholder="BUSCAR POR DESCRIPCIÓN (MÍN. 3 CARACTERES)"
            />
          </FilterRowSearch>
          <LimpiarFiltrosButton onClick={limpiarFiltros} />
          <Button
            type="button"
            variant={modoDescuentosInline ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 text-xs uppercase"
            aria-pressed={modoDescuentosInline}
            onClick={toggleModoDescuentosInline}
          >
            Desc. en fila
          </Button>
          <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
            {total.toLocaleString()} PRODUCTO
            {total !== 1 ? "S" : ""}
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
            <col className="w-[6.5rem]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>COD. EXT.</TableHead>
              {showProveedorColumn ? <TableHead>PROV.</TableHead> : null}
              <TableHead>DESCRIPCION</TableHead>
              <TableHead className="text-right">PX. LISTA PROV.</TableHead>
              <TableHead className="text-right">PX. FINAL</TableHead>
              <TableHead className="text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasFilterActive &&
              !loading &&
              filteredFilas.map((fila) => (
                <TableRow key={fila.id}>
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
                      <TableCell className="celda-datos min-w-0 overflow-hidden">
                        <DescripcionCelda
                          fila={fila}
                          modoDescuentosInline={modoDescuentosInline}
                          onVerRegla={abrirReglaDescuento}
                        />
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
                    <div
                      className={cn(
                        TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
                        "justify-center gap-0.5"
                      )}
                    >
                      {puedeEdicionMasiva ? (
                        <>
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
                            <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={
                              fila.precioRex
                                ? `Cambiar vínculo REX de ${fila.codExt}`
                                : `Vincular REX a ${fila.codExt}`
                            }
                            onClick={() => {
                              setFilaVincular(fila);
                              setVincularOpen(true);
                            }}
                          >
                            <Link2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={`Eliminar ${fila.codExt}`}
                            onClick={() => {
                              setFilaEliminar(fila);
                              setEliminarOpen(true);
                            }}
                          >
                            <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
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
        <>
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
          <VincularPrecioRexModal
            open={vincularOpen}
            onClose={() => {
              setVincularOpen(false);
              setFilaVincular(null);
            }}
            fila={filaVincular}
            onVinculado={onEdicionSuccess}
          />
          <EliminarListaPrecioModal
            open={eliminarOpen}
            onOpenChange={(next) => {
              setEliminarOpen(next);
              if (!next) setFilaEliminar(null);
            }}
            fila={filaEliminar}
            onSuccess={onEdicionSuccess}
          />
        </>
      )}

      <ReglaDescuentoItemListaPreciosModal
        open={reglaModalOpen}
        onOpenChange={(next) => {
          setReglaModalOpen(next);
          if (!next) {
            setReglaModalDescuento(null);
            setReglaModalCodExt(undefined);
          }
        }}
        descuento={reglaModalDescuento}
        codExt={reglaModalCodExt}
      />

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
