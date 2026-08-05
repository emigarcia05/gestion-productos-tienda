"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FilterBar, {
  FILTER_COUNT_CLASS,
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowSearch,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import EstVtasGraficoVarianteBarras from "@/components/estadisticas-productos/EstVtasGraficoVarianteBarras";
import { matchByMultiTerm } from "@/lib/busqueda";
import { agregarUnidadesPorVariante } from "@/lib/estVtasAgregar";
import type {
  EstVtasModoUnidad,
  EstVtasProductoItem,
  EstVtasVentaItem,
} from "@/lib/estVtasTypes";
import type { SucursalEstOption } from "@/lib/estPorProdTypes";
import {
  clavePeriodoEstPorProd,
  etiquetaPeriodoCortoEstPorProd,
  listarPeriodosCargaEstPorProd,
} from "@/lib/estPorProdPeriodo";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";

const FILTRO_TODOS = "none";
const FILTRO_SIN_COLOR = "__SIN_COLOR__";
const FILTRO_SIN_TERMINACION = "__SIN_TERMINACION__";
const FILTRO_SIN_PRESENTACION = "__SIN_PRESENTACION__";

const FOCUS_KEY = "filtros-est-vtas-focus";

interface Props {
  filas: EstVtasProductoItem[];
  ventas: EstVtasVentaItem[];
  sucursales: SucursalEstOption[];
  mesActual: number;
  anioActual: number;
}

function opcionesOrdenadas(valores: string[]): string[] {
  return [...new Set(valores.filter((v) => v.trim() !== ""))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

export default function EstVtasPageClient({
  filas,
  ventas,
  sucursales,
  mesActual,
  anioActual,
}: Props) {
  const periodoActualClave = clavePeriodoEstPorProd(mesActual, anioActual);

  const [filtMarca, setFiltMarca] = useState(FILTRO_TODOS);
  const [filtRubro, setFiltRubro] = useState(FILTRO_TODOS);
  const [filtSubRubro, setFiltSubRubro] = useState(FILTRO_TODOS);
  const [filtColor, setFiltColor] = useState(FILTRO_TODOS);
  const [filtTerminacion, setFiltTerminacion] = useState(FILTRO_TODOS);
  const [filtPresentacion, setFiltPresentacion] = useState(FILTRO_TODOS);
  const [filtSucursalId, setFiltSucursalId] = useState(FILTRO_TODOS);
  const [filtFecha, setFiltFecha] = useState(periodoActualClave);
  const [filtUnidad, setFiltUnidad] = useState<EstVtasModoUnidad>("unidad");
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
    },
  });

  const periodos = useMemo(
    () => listarPeriodosCargaEstPorProd({ mes: mesActual, anio: anioActual }),
    [mesActual, anioActual]
  );

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

  const barrasVariante = useMemo(
    () =>
      agregarUnidadesPorVariante({
        productosFiltrados: filasFiltradas,
        ventas,
        sucursalId: filtSucursalId,
        fechaClave: filtFecha,
        modoUnidad: filtUnidad,
      }),
    [filasFiltradas, ventas, filtSucursalId, filtFecha, filtUnidad]
  );

  function limpiarFiltros() {
    setFiltMarca(FILTRO_TODOS);
    setFiltRubro(FILTRO_TODOS);
    setFiltSubRubro(FILTRO_TODOS);
    setFiltColor(FILTRO_TODOS);
    setFiltTerminacion(FILTRO_TODOS);
    setFiltPresentacion(FILTRO_TODOS);
    setFiltSucursalId(FILTRO_TODOS);
    setFiltFecha(periodoActualClave);
    setFiltUnidad("unidad");
    setQ("");
    setQDebounced("");
  }

  return (
    <ClassicFilteredTableLayout
      title="ESTADÍSTICAS PRODUCTOS"
      subtitle="Estadísticas Vtas"
      contentWidth="full"
      filters={
        <div className="flex flex-col gap-2">
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
                  }}
                >
                  <Select
                    value={filtMarca}
                    onValueChange={(v) => {
                      setFiltMarca(v);
                      setFiltRubro(FILTRO_TODOS);
                      setFiltSubRubro(FILTRO_TODOS);
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
                  }}
                >
                  <Select
                    value={filtRubro}
                    onValueChange={(v) => {
                      setFiltRubro(v);
                      setFiltSubRubro(FILTRO_TODOS);
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
                  onLimpiar={() => setFiltSubRubro(FILTRO_TODOS)}
                >
                  <Select value={filtSubRubro} onValueChange={setFiltSubRubro}>
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
                  onLimpiar={() => setFiltColor(FILTRO_TODOS)}
                >
                  <Select value={filtColor} onValueChange={setFiltColor}>
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
                  onLimpiar={() => setFiltTerminacion(FILTRO_TODOS)}
                >
                  <Select value={filtTerminacion} onValueChange={setFiltTerminacion}>
                    <SelectTrigger
                      className="input-filtro-unificado"
                      aria-label="Terminacion"
                    >
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
                      <SelectItem value={FILTRO_SIN_TERMINACION}>
                        SIN TERMINACION
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtPresentacion !== FILTRO_TODOS}
                  onLimpiar={() => setFiltPresentacion(FILTRO_TODOS)}
                >
                  <Select
                    value={filtPresentacion}
                    onValueChange={setFiltPresentacion}
                  >
                    <SelectTrigger
                      className="input-filtro-unificado"
                      aria-label="Presentacion"
                    >
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
                      <SelectItem value={FILTRO_SIN_PRESENTACION}>
                        SIN PRESENTACION
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>

            <div className="flex items-center gap-3">
              <FilterRowSearch className="flex-1">
                <FiltroBusquedaInput
                  id="filtro-est-vtas-descripcion"
                  placeholder="Buscar por descripción..."
                  value={q}
                  onChange={(value) => {
                    handleQChange(value);
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

          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtSucursalId !== FILTRO_TODOS}
                  onLimpiar={() => setFiltSucursalId(FILTRO_TODOS)}
                >
                  <Select value={filtSucursalId} onValueChange={setFiltSucursalId}>
                    <SelectTrigger
                      className="input-filtro-unificado"
                      aria-label="Sucursales"
                    >
                      <SelectValue placeholder="SUCURSALES" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro max-h-60"
                    >
                      <SelectItem value={FILTRO_TODOS}>SUCURSALES</SelectItem>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtFecha !== periodoActualClave}
                  onLimpiar={() => setFiltFecha(periodoActualClave)}
                >
                  <Select value={filtFecha} onValueChange={setFiltFecha}>
                    <SelectTrigger className="input-filtro-unificado" aria-label="Fecha">
                      <SelectValue placeholder="FECHA" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro max-h-60"
                    >
                      {periodos.map((p) => {
                        const clave = clavePeriodoEstPorProd(p.mes, p.anio);
                        return (
                          <SelectItem key={clave} value={clave}>
                            {etiquetaPeriodoCortoEstPorProd(p.mes, p.anio).toLocaleUpperCase(
                              "es-AR"
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtUnidad !== "unidad"}
                  onLimpiar={() => setFiltUnidad("unidad")}
                >
                  <Select
                    value={filtUnidad}
                    onValueChange={(v) => setFiltUnidad(v as EstVtasModoUnidad)}
                  >
                    <SelectTrigger className="input-filtro-unificado" aria-label="Unidad">
                      <SelectValue placeholder="UNIDAD" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="unidad">UNIDAD</SelectItem>
                      <SelectItem value="suma">SUMA DE UNIDADES</SelectItem>
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-2 gap-2")}>
                  <span className={FILTER_COUNT_CLASS}>
                    {filasFiltradas.length.toLocaleString("es-AR")} PRODUCTO
                    {filasFiltradas.length === 1 ? "" : "S"}
                  </span>
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 rounded-md border border-border border-dashed bg-card/40" />
        <EstVtasGraficoVarianteBarras
          barras={barrasVariante}
          className="h-full max-h-full w-[min(28rem,40%)] shrink-0 self-start"
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}
