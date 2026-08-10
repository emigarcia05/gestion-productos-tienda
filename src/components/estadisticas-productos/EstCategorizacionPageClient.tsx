"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Beaker, Paintbrush, Palette, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FILTER_COUNT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowSearch,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionClient from "@/components/shared/PaginacionClient";
import GestionarEstPorProdColoresModal from "@/components/estadisticas-productos/GestionarEstPorProdColoresModal";
import GestionarEstPorProdPresentacionModal from "@/components/estadisticas-productos/GestionarEstPorProdPresentacionModal";
import GestionarEstPorProdTerminacionModal from "@/components/estadisticas-productos/GestionarEstPorProdTerminacionModal";
import GestionarEstPorProdUnPresentacionModal from "@/components/estadisticas-productos/GestionarEstPorProdUnPresentacionModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import { matchByMultiTerm } from "@/lib/busqueda";
import type { EstCategorizacionItem } from "@/lib/estCategorizacionTypes";
import type { EstPorProdColorItem } from "@/lib/estPorProdColores";
import type { EstPorProdPresentacionItem } from "@/lib/estPorProdPresentacion";
import type { EstPorProdTerminacionItem } from "@/lib/estPorProdTerminacion";
import type { EstPorProdUnPresentacionItem } from "@/lib/estPorProdUnPresentacion";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const FILTRO_TODOS = "none";
const FILTRO_SIN_COLOR = "__SIN_COLOR__";
const FILTRO_SIN_TERMINACION = "__SIN_TERMINACION__";
const FILTRO_SIN_PRESENTACION = "__SIN_PRESENTACION__";
const FOCUS_KEY = "filtros-est-categorizacion-focus";

interface Props {
  filas: EstCategorizacionItem[];
  coloresCatalogo: EstPorProdColorItem[];
  presentacionesCatalogo: EstPorProdPresentacionItem[];
  unidadesCatalogo: EstPorProdUnPresentacionItem[];
  terminacionesCatalogo: EstPorProdTerminacionItem[];
  esEditor: boolean;
}

function opcionesOrdenadas(valores: string[]): string[] {
  return [...new Set(valores.filter((v) => v.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

export default function EstCategorizacionPageClient({
  filas,
  coloresCatalogo,
  presentacionesCatalogo,
  unidadesCatalogo,
  terminacionesCatalogo,
  esEditor,
}: Props) {
  const router = useRouter();
  const [filtMarca, setFiltMarca] = useState(FILTRO_TODOS);
  const [filtRubro, setFiltRubro] = useState(FILTRO_TODOS);
  const [filtSubRubro, setFiltSubRubro] = useState(FILTRO_TODOS);
  const [filtColor, setFiltColor] = useState(FILTRO_TODOS);
  const [filtTerminacion, setFiltTerminacion] = useState(FILTRO_TODOS);
  const [filtPresentacion, setFiltPresentacion] = useState(FILTRO_TODOS);
  const [modalColoresOpen, setModalColoresOpen] = useState(false);
  const [modalUnidadesOpen, setModalUnidadesOpen] = useState(false);
  const [modalPresentacionOpen, setModalPresentacionOpen] = useState(false);
  const [modalTerminacionOpen, setModalTerminacionOpen] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [qDebounced, setQDebounced] = useState("");

  const {
    q,
    setQ,
    ref: inputRef,
    handleQChange,
    isDebouncing,
  } = useFiltrosConBusqueda({
    qActual: qDebounced,
    debounceMs: 300,
    focusStorageKey: FOCUS_KEY,
    onDebouncedSearch: (value) => {
      setQDebounced(value);
      setPaginaActual(1);
    },
  });

  const marcas = useMemo(
    () => opcionesOrdenadas(filas.map((f) => f.marca)),
    [filas]
  );

  const rubros = useMemo(() => {
    const base =
      filtMarca === FILTRO_TODOS
        ? filas
        : filas.filter((f) => f.marca === filtMarca);
    return opcionesOrdenadas(base.map((f) => f.rubro));
  }, [filas, filtMarca]);

  const subRubros = useMemo(() => {
    let base = filas;
    if (filtMarca !== FILTRO_TODOS) base = base.filter((f) => f.marca === filtMarca);
    if (filtRubro !== FILTRO_TODOS) base = base.filter((f) => f.rubro === filtRubro);
    return opcionesOrdenadas(base.map((f) => f.subRubro));
  }, [filas, filtMarca, filtRubro]);

  const colores = useMemo(() => {
    const names = filas.flatMap((f) => f.colores);
    return opcionesOrdenadas(names);
  }, [filas]);

  const terminacionesOpciones = useMemo(() => {
    const names = filas.flatMap((f) => f.terminaciones);
    return opcionesOrdenadas(names);
  }, [filas]);

  const presentacionOpciones = useMemo(() => {
    return opcionesOrdenadas(
      filas.map((f) => f.presentacionEtiqueta).filter((v) => v.trim() !== "")
    );
  }, [filas]);

  const filasFiltradas = useMemo(() => {
    let out = filas;
    if (filtMarca !== FILTRO_TODOS) {
      out = out.filter((f) => f.marca === filtMarca);
    }
    if (filtRubro !== FILTRO_TODOS) {
      out = out.filter((f) => f.rubro === filtRubro);
    }
    if (filtSubRubro !== FILTRO_TODOS) {
      out = out.filter((f) => f.subRubro === filtSubRubro);
    }
    if (filtColor === FILTRO_SIN_COLOR) {
      out = out.filter((f) => f.colores.length === 0);
    } else if (filtColor !== FILTRO_TODOS) {
      out = out.filter((f) => f.colores.includes(filtColor));
    }
    if (filtTerminacion === FILTRO_SIN_TERMINACION) {
      out = out.filter((f) => f.terminaciones.length === 0);
    } else if (filtTerminacion !== FILTRO_TODOS) {
      out = out.filter((f) => f.terminaciones.includes(filtTerminacion));
    }
    if (filtPresentacion === FILTRO_SIN_PRESENTACION) {
      out = out.filter((f) => f.presentacionEtiqueta.trim() === "");
    } else if (filtPresentacion !== FILTRO_TODOS) {
      out = out.filter((f) => f.presentacionEtiqueta === filtPresentacion);
    }
    const qTrim = qDebounced.trim();
    if (qTrim) {
      out = out.filter((f) => matchByMultiTerm([f.descripcionTienda], qTrim));
    }
    return out;
  }, [
    filas,
    filtMarca,
    filtRubro,
    filtSubRubro,
    filtColor,
    filtTerminacion,
    filtPresentacion,
    qDebounced,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / PAGE_SIZE));
  const paginaSafe = Math.min(paginaActual, totalPaginas);
  const filasPagina = filasFiltradas.slice(
    (paginaSafe - 1) * PAGE_SIZE,
    paginaSafe * PAGE_SIZE
  );

  function limpiarFiltros() {
    setFiltMarca(FILTRO_TODOS);
    setFiltRubro(FILTRO_TODOS);
    setFiltSubRubro(FILTRO_TODOS);
    setFiltColor(FILTRO_TODOS);
    setFiltTerminacion(FILTRO_TODOS);
    setFiltPresentacion(FILTRO_TODOS);
    setQ("");
    setQDebounced("");
    setPaginaActual(1);
  }

  const emptyMessage =
    filas.length > 0 && filasFiltradas.length === 0
      ? "Ningún producto coincide con los filtros seleccionados."
      : undefined;

  return (
    <>
      <ClassicFilteredTableLayout
        title="ESTADÍSTICAS PRODUCTOS"
        subtitle="Configuracion"
        contentWidth="full"
      actions={
        esEditor ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-10 px-4 gap-2"
              onClick={() => setModalColoresOpen(true)}
            >
              <Palette className="h-4 w-4 shrink-0" aria-hidden />
              Gestion Colores
            </Button>
            <Button
              type="button"
              className="h-10 px-4 gap-2"
              onClick={() => setModalUnidadesOpen(true)}
            >
              <Ruler className="h-4 w-4 shrink-0" aria-hidden />
              Gestion Unidades
            </Button>
            <Button
              type="button"
              className="h-10 px-4 gap-2"
              onClick={() => setModalPresentacionOpen(true)}
            >
              <Beaker className="h-4 w-4 shrink-0" aria-hidden />
              Gestion Presentacion
            </Button>
            <Button
              type="button"
              className="h-10 px-4 gap-2"
              onClick={() => setModalTerminacionOpen(true)}
            >
              <Paintbrush className="h-4 w-4 shrink-0" aria-hidden />
              Gestion Terminacion
            </Button>
          </div>
        ) : undefined
      }
        filters={
        <FilterBar className="filtros-contenedor-tienda bg-card">
          <FilterRowSelection className="w-full min-w-0">
            <FilaFiltrosDesplegables columnas={6}>
              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtMarca !== FILTRO_TODOS}
                onLimpiar={() => {
                  setFiltMarca(FILTRO_TODOS);
                  setFiltRubro(FILTRO_TODOS);
                  setFiltSubRubro(FILTRO_TODOS);
                  setPaginaActual(1);
                }}
              >
                <Select
                  value={filtMarca}
                  onValueChange={(v) => {
                    setFiltMarca(v);
                    setFiltRubro(FILTRO_TODOS);
                    setFiltSubRubro(FILTRO_TODOS);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado" aria-label="Marca">
                    <SelectValue placeholder="MARCA" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-60"
                  >
                    <SelectItem value={FILTRO_TODOS}>MARCA</SelectItem>
                    {marcas.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>

              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtRubro !== FILTRO_TODOS}
                onLimpiar={() => {
                  setFiltRubro(FILTRO_TODOS);
                  setFiltSubRubro(FILTRO_TODOS);
                  setPaginaActual(1);
                }}
              >
                <Select
                  value={filtRubro}
                  onValueChange={(v) => {
                    setFiltRubro(v);
                    setFiltSubRubro(FILTRO_TODOS);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado" aria-label="Rubro">
                    <SelectValue placeholder="RUBRO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-60"
                  >
                    <SelectItem value={FILTRO_TODOS}>RUBRO</SelectItem>
                    {rubros.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>

              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtSubRubro !== FILTRO_TODOS}
                onLimpiar={() => {
                  setFiltSubRubro(FILTRO_TODOS);
                  setPaginaActual(1);
                }}
              >
                <Select
                  value={filtSubRubro}
                  onValueChange={(v) => {
                    setFiltSubRubro(v);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado" aria-label="Sub Rubro">
                    <SelectValue placeholder="SUB RUBRO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-60"
                  >
                    <SelectItem value={FILTRO_TODOS}>SUB RUBRO</SelectItem>
                    {subRubros.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>

              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtColor !== FILTRO_TODOS}
                onLimpiar={() => {
                  setFiltColor(FILTRO_TODOS);
                  setPaginaActual(1);
                }}
              >
                <Select
                  value={filtColor}
                  onValueChange={(v) => {
                    setFiltColor(v);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado" aria-label="Color">
                    <SelectValue placeholder="COLOR" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-60"
                  >
                    <SelectItem value={FILTRO_TODOS}>COLOR</SelectItem>
                    {colores.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value={FILTRO_SIN_COLOR}>SIN COLOR</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>

              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtTerminacion !== FILTRO_TODOS}
                onLimpiar={() => {
                  setFiltTerminacion(FILTRO_TODOS);
                  setPaginaActual(1);
                }}
              >
                <Select
                  value={filtTerminacion}
                  onValueChange={(v) => {
                    setFiltTerminacion(v);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado" aria-label="Terminacion">
                    <SelectValue placeholder="TERMINACION" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-60"
                  >
                    <SelectItem value={FILTRO_TODOS}>TERMINACION</SelectItem>
                    {terminacionesOpciones.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                    <SelectItem value={FILTRO_SIN_TERMINACION}>SIN TERMINACION</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>

              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtPresentacion !== FILTRO_TODOS}
                onLimpiar={() => {
                  setFiltPresentacion(FILTRO_TODOS);
                  setPaginaActual(1);
                }}
              >
                <Select
                  value={filtPresentacion}
                  onValueChange={(v) => {
                    setFiltPresentacion(v);
                    setPaginaActual(1);
                  }}
                >
                  <SelectTrigger className="input-filtro-unificado" aria-label="Presentacion">
                    <SelectValue placeholder="PRESENTACION" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro max-h-60"
                  >
                    <SelectItem value={FILTRO_TODOS}>PRESENTACION</SelectItem>
                    {presentacionOpciones.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                    <SelectItem value={FILTRO_SIN_PRESENTACION}>SIN PRESENTACION</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
            </FilaFiltrosDesplegables>
          </FilterRowSelection>

          <div className="flex items-center gap-3">
            <FilterRowSearch className="flex-1">
              <FiltroBusquedaInput
                id="filtro-est-categorizacion-descripcion"
                placeholder="Buscar por descripción..."
                value={q}
                onChange={(value) => {
                  handleQChange(value);
                  setPaginaActual(1);
                }}
                isDebouncing={isDebouncing}
                inputRef={inputRef}
              />
            </FilterRowSearch>
            <LimpiarFiltrosButton onClick={limpiarFiltros} />
            <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
              {filasFiltradas.length.toLocaleString("es-AR")} PRODUCTO
              {filasFiltradas.length === 1 ? "" : "S"}
            </span>
          </div>
        </FilterBar>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[32%]">DESCRIPCIÓN</TableHead>
                  <TableHead className="w-[12%]">MARCA</TableHead>
                  <TableHead className="w-[12%]">RUBRO</TableHead>
                  <TableHead className="w-[12%]">SUB RUBRO</TableHead>
                  <TableHead className="w-[12%]">COLOR</TableHead>
                  <TableHead className="w-[12%]">TERMINACION</TableHead>
                  <TableHead className="w-[8%]">PRESENTACION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasPagina.length === 0 ? (
                  <EmptyTableRow
                    colSpan={7}
                    message={
                      emptyMessage ??
                      (filas.length === 0
                        ? "No hay productos en el catálogo tienda."
                        : "Sin resultados.")
                    }
                  />
                ) : (
                  filasPagina.map((f) => (
                    <TableRow key={f.codTienda}>
                      <TableCell className="celda-datos">
                        {f.descripcionTienda || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="celda-datos">
                        {f.marca || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="celda-datos">
                        {f.rubro || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="celda-datos">
                        {f.subRubro || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="celda-datos">
                        {f.colorEtiqueta || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="celda-datos">
                        {f.terminacionEtiqueta || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="celda-datos">
                        {f.presentacionEtiqueta || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filasFiltradas.length > PAGE_SIZE ? (
            <div className="border-t border-border px-4 py-3">
              <PaginacionClient
                paginaActual={paginaSafe}
                totalPaginas={totalPaginas}
                onPaginaChange={setPaginaActual}
              />
            </div>
          ) : null}
        </section>
      </div>
    </ClassicFilteredTableLayout>

      <GestionarEstPorProdColoresModal
        open={modalColoresOpen}
        onOpenChange={setModalColoresOpen}
        itemsIniciales={coloresCatalogo}
        esEditor={esEditor}
        onCatalogoChanged={() => router.refresh()}
      />

      <GestionarEstPorProdUnPresentacionModal
        open={modalUnidadesOpen}
        onOpenChange={setModalUnidadesOpen}
        itemsIniciales={unidadesCatalogo}
        esEditor={esEditor}
        onCatalogoChanged={() => router.refresh()}
      />

      <GestionarEstPorProdPresentacionModal
        open={modalPresentacionOpen}
        onOpenChange={setModalPresentacionOpen}
        itemsIniciales={presentacionesCatalogo}
        unidades={unidadesCatalogo}
        esEditor={esEditor}
        onCatalogoChanged={() => router.refresh()}
      />

      <GestionarEstPorProdTerminacionModal
        open={modalTerminacionOpen}
        onOpenChange={setModalTerminacionOpen}
        itemsIniciales={terminacionesCatalogo}
        esEditor={esEditor}
        onCatalogoChanged={() => router.refresh()}
      />
    </>
  );
}
