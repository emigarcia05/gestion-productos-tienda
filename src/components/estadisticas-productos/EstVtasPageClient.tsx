"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import EstVtasGraficoBarrasMensual from "@/components/estadisticas-productos/EstVtasGraficoBarrasMensual";
import EstVtasGraficoTopProductos from "@/components/estadisticas-productos/EstVtasGraficoTopProductos";
import EstVtasGraficoVarianteBarras from "@/components/estadisticas-productos/EstVtasGraficoVarianteBarras";
import { matchByMultiTerm } from "@/lib/busqueda";
import { filterItemsBySelectSearch } from "@/lib/selectSearch";
import SelectSearchInput from "@/components/shared/SelectSearchInput";
import {
  agregarTopProductos,
  agregarUnidadesMensualesAnio,
  agregarUnidadesPorDobleDimension,
  agregarUnidadesPorEjeY,
  filtroProductoDesdeDimension,
} from "@/lib/estVtasAgregar";
import {
  esEstVtasEjeY,
  type EstVtasDesglose,
  type EstVtasDimensionGrafico,
  type EstVtasFiltroDimension,
  type EstVtasModoUnidad,
  type EstVtasProductoItem,
  type EstVtasSeleccionDesglose,
  type EstVtasVentaItem,
} from "@/lib/estVtasTypes";
import type { SucursalEstOption } from "@/lib/estPorProdTypes";
import {
  clavePeriodoEstPorProd,
  clavePeriodoMasRecienteConVentas,
  etiquetaMesCortoEstPorProd,
  etiquetaMesEstPorProd,
  listarPeriodosCargaEstPorProd,
  parseClavePeriodoEstPorProd,
} from "@/lib/estPorProdPeriodo";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

const FILTRO_TODOS = "none";
const FILTRO_SIN_COLOR = "__SIN_COLOR__";
const FILTRO_SIN_TERMINACION = "__SIN_TERMINACION__";
const FILTRO_SIN_PRESENTACION = "__SIN_PRESENTACION__";

const FOCUS_KEY = "filtros-est-vtas-focus";

const MESES_CALENDARIO: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

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

function mismosNumeros(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function etiquetaAniosSeleccionados(aniosSel: number[]): string {
  if (aniosSel.length === 0) return "AÑO";
  const sorted = [...aniosSel].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  return sorted.join(" · ");
}

function etiquetaMesesSeleccionados(mesesSel: number[]): string {
  if (mesesSel.length === 0) return "MES";
  const sorted = [...mesesSel].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return (
      MESES_CALENDARIO.find((m) => m.valor === sorted[0])?.etiqueta ??
      etiquetaMesEstPorProd(sorted[0]!).toLocaleUpperCase("es-AR")
    );
  }
  return sorted.map((n) => etiquetaMesCortoEstPorProd(n)).join(" · ");
}

export default function EstVtasPageClient({
  filas,
  ventas,
  sucursales,
  mesActual,
  anioActual,
}: Props) {
  const periodoDefault = useMemo(() => {
    const clave = clavePeriodoMasRecienteConVentas(ventas, {
      mes: mesActual,
      anio: anioActual,
    });
    return (
      parseClavePeriodoEstPorProd(clave) ?? {
        mes: mesActual,
        anio: anioActual,
      }
    );
  }, [ventas, mesActual, anioActual]);

  const [filtMarca, setFiltMarca] = useState(FILTRO_TODOS);
  const [filtRubro, setFiltRubro] = useState(FILTRO_TODOS);
  const [filtSubRubro, setFiltSubRubro] = useState(FILTRO_TODOS);
  const [filtColor, setFiltColor] = useState(FILTRO_TODOS);
  const [filtTerminacion, setFiltTerminacion] = useState(FILTRO_TODOS);
  const [filtPresentacion, setFiltPresentacion] = useState(FILTRO_TODOS);
  const [filtSucursalId, setFiltSucursalId] = useState(FILTRO_TODOS);
  const [filtAnios, setFiltAnios] = useState<number[]>([periodoDefault.anio]);
  const [filtMeses, setFiltMeses] = useState<number[]>([periodoDefault.mes]);
  const [filtUnidad, setFiltUnidad] = useState<EstVtasModoUnidad>("unidad");
  const [aniosOpen, setAniosOpen] = useState(false);
  const [mesesOpen, setMesesOpen] = useState(false);
  const [aniosQuery, setAniosQuery] = useState("");
  const [mesesQuery, setMesesQuery] = useState("");
  const aniosMultiRef = useRef<HTMLDivElement>(null);
  const mesesMultiRef = useRef<HTMLDivElement>(null);
  const [dimension1, setDimension1] =
    useState<EstVtasDimensionGrafico>("marca");
  const [desglose1, setDesglose1] = useState<EstVtasDesglose>("ninguno");
  const [seleccionGrafico1, setSeleccionGrafico1] = useState<string | null>(null);
  const [seleccionDesglose1, setSeleccionDesglose1] =
    useState<EstVtasSeleccionDesglose | null>(null);
  /** `codTienda` del producto elegido en el Top 10. */
  const [seleccionProductoTop, setSeleccionProductoTop] = useState<string | null>(
    null
  );
  const [qDebounced, setQDebounced] = useState("");

  const periodosConVentas = useMemo(() => {
    const keys = new Set(
      ventas.map((v) => clavePeriodoEstPorProd(v.mes, v.anio))
    );
    return keys;
  }, [ventas]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (aniosMultiRef.current && !aniosMultiRef.current.contains(t)) {
        setAniosOpen(false);
        setAniosQuery("");
      }
      if (mesesMultiRef.current && !mesesMultiRef.current.contains(t)) {
        setMesesOpen(false);
        setMesesQuery("");
      }
    }
    if (aniosOpen || mesesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [aniosOpen, mesesOpen]);

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

  const aniosOpciones = useMemo(() => {
    const set = new Set(periodos.map((p) => p.anio));
    return [...set].sort((a, b) => b - a);
  }, [periodos]);

  const aniosFiltrados = useMemo(
    () =>
      filterItemsBySelectSearch(aniosOpciones, aniosQuery, (a) => {
        const conDatos = [...periodosConVentas].some((k) => k.startsWith(`${a}-`));
        return conDatos ? String(a) : `${a} (SIN DATOS)`;
      }),
    [aniosOpciones, aniosQuery, periodosConVentas]
  );

  const mesesFiltrados = useMemo(
    () => filterItemsBySelectSearch(MESES_CALENDARIO, mesesQuery, (m) => m.etiqueta),
    [mesesQuery]
  );

  const labelAnios = etiquetaAniosSeleccionados(filtAnios);
  const labelMeses = etiquetaMesesSeleccionados(filtMeses);
  const aniosFiltroActivo = !mismosNumeros(filtAnios, [periodoDefault.anio]);
  const mesesFiltroActivo = !mismosNumeros(filtMeses, [periodoDefault.mes]);

  function toggleAnio(anioValor: number) {
    const tiene = filtAnios.includes(anioValor);
    if (tiene && filtAnios.length === 1) {
      toast.info("Dejá al menos un año seleccionado.");
      return;
    }
    setFiltAnios(
      tiene
        ? filtAnios.filter((a) => a !== anioValor)
        : [...filtAnios, anioValor]
    );
  }

  function toggleMes(mesValor: number) {
    const tiene = filtMeses.includes(mesValor);
    if (tiene && filtMeses.length === 1) {
      toast.info("Dejá al menos un mes seleccionado.");
      return;
    }
    setFiltMeses(
      tiene
        ? filtMeses.filter((m) => m !== mesValor)
        : [...filtMeses, mesValor]
    );
  }

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

  const desgloseActivo = desglose1 !== "ninguno";

  const barrasCategoria1 = useMemo(
    () =>
      agregarUnidadesPorEjeY({
        productosFiltrados: filasFiltradas,
        ventas,
        sucursalId: filtSucursalId,
        anios: filtAnios,
        meses: filtMeses,
        modoUnidad: filtUnidad,
        ejeY: dimension1,
        sucursales,
      }),
    [
      filasFiltradas,
      ventas,
      filtSucursalId,
      filtAnios,
      filtMeses,
      filtUnidad,
      dimension1,
      sucursales,
    ]
  );

  const gruposGrafico1 = useMemo(() => {
    if (desglose1 === "ninguno") return null;
    return agregarUnidadesPorDobleDimension({
      productosFiltrados: filasFiltradas,
      ventas,
      anios: filtAnios,
      meses: filtMeses,
      modoUnidad: filtUnidad,
      dimension: dimension1,
      desglose: desglose1,
      sucursales,
    });
  }, [
    desglose1,
    filasFiltradas,
    ventas,
    filtAnios,
    filtMeses,
    filtUnidad,
    dimension1,
    sucursales,
  ]);

  const seleccionDesgloseValida = useMemo(() => {
    if (!desgloseActivo || !seleccionDesglose1 || !gruposGrafico1) return null;
    const ok = gruposGrafico1.some(
      (g) =>
        g.id === seleccionDesglose1.categoriaId &&
        g.hijos.some((h) => h.id === seleccionDesglose1.hijoId)
    );
    return ok ? seleccionDesglose1 : null;
  }, [desgloseActivo, seleccionDesglose1, gruposGrafico1]);

  const seleccionCategoria1Valida = useMemo(() => {
    if (desgloseActivo) {
      return seleccionDesgloseValida?.categoria ?? null;
    }
    if (
      seleccionGrafico1 &&
      barrasCategoria1.some((b) => b.etiqueta === seleccionGrafico1)
    ) {
      return seleccionGrafico1;
    }
    return null;
  }, [
    desgloseActivo,
    seleccionDesgloseValida,
    seleccionGrafico1,
    barrasCategoria1,
  ]);

  /** Sucursal efectiva: selección G1 (plano o desglose) o filtro global. */
  const sucursalIdEfectiva = useMemo(() => {
    if (desgloseActivo && seleccionDesgloseValida) {
      if (dimension1 === "sucursal") return seleccionDesgloseValida.categoriaId;
      if (desglose1 === "sucursal") return seleccionDesgloseValida.hijoId;
    } else if (!desgloseActivo && seleccionCategoria1Valida && dimension1 === "sucursal") {
      const barra = barrasCategoria1.find(
        (b) => b.etiqueta === seleccionCategoria1Valida
      );
      if (barra?.id) return barra.id;
    }
    return filtSucursalId;
  }, [
    desgloseActivo,
    seleccionDesgloseValida,
    dimension1,
    desglose1,
    seleccionCategoria1Valida,
    barrasCategoria1,
    filtSucursalId,
  ]);

  /** Filtros de producto derivados de la selección del gráfico 1. */
  const filtrosDimensionG1 = useMemo((): EstVtasFiltroDimension[] | null => {
    if (!seleccionCategoria1Valida) return null;

    if (seleccionDesgloseValida && desglose1 !== "ninguno") {
      const out: EstVtasFiltroDimension[] = [];
      const fCat = filtroProductoDesdeDimension(
        dimension1,
        seleccionDesgloseValida.categoria
      );
      if (fCat) out.push(fCat);
      const fHijo = filtroProductoDesdeDimension(
        desglose1,
        seleccionDesgloseValida.hijoEtiqueta
      );
      if (fHijo) out.push(fHijo);
      return out.length > 0 ? out : null;
    }

    if (esEstVtasEjeY(dimension1)) {
      return [{ ejeY: dimension1, etiqueta: seleccionCategoria1Valida }];
    }
    return null;
  }, [
    seleccionCategoria1Valida,
    seleccionDesgloseValida,
    desglose1,
    dimension1,
  ]);

  const barrasTopProductos = useMemo(() => {
    return agregarTopProductos({
      productosFiltrados: filasFiltradas,
      ventas,
      sucursalId: sucursalIdEfectiva,
      anios: filtAnios,
      meses: filtMeses,
      modoUnidad: filtUnidad,
      filtros: filtrosDimensionG1,
      topN: 10,
    });
  }, [
    filasFiltradas,
    ventas,
    sucursalIdEfectiva,
    filtAnios,
    filtMeses,
    filtUnidad,
    filtrosDimensionG1,
  ]);

  const seleccionProductoTopValida =
    seleccionProductoTop &&
    barrasTopProductos.some((b) => b.codTienda === seleccionProductoTop)
      ? seleccionProductoTop
      : null;

  const puntosMensuales = useMemo(() => {
    // G3: ENE…DIC; respeta años seleccionados; ignora filtro Mes de página.
    return agregarUnidadesMensualesAnio({
      productosFiltrados: filasFiltradas,
      ventas,
      sucursalId: sucursalIdEfectiva,
      modoUnidad: filtUnidad,
      anios: filtAnios,
      filtros: filtrosDimensionG1,
      codTienda: seleccionProductoTopValida,
    });
  }, [
    filasFiltradas,
    ventas,
    sucursalIdEfectiva,
    filtUnidad,
    filtAnios,
    filtrosDimensionG1,
    seleccionProductoTopValida,
  ]);

  function handleDimension1Change(dim: EstVtasDimensionGrafico) {
    setDimension1(dim);
    if (desglose1 === dim) {
      setDesglose1("ninguno");
    }
    setSeleccionGrafico1(null);
    setSeleccionDesglose1(null);
    setSeleccionProductoTop(null);
  }

  function handleDesglose1Change(desglose: EstVtasDesglose) {
    // Opciones de UI ya excluyen la dimensión activa; defensivo si coinciden.
    setDesglose1(
      desglose !== "ninguno" && desglose === dimension1 ? "ninguno" : desglose
    );
    setSeleccionGrafico1(null);
    setSeleccionDesglose1(null);
    setSeleccionProductoTop(null);
  }

  function handleSeleccionarGrafico1(etiqueta: string | null) {
    setSeleccionGrafico1(etiqueta);
    setSeleccionDesglose1(null);
    setSeleccionProductoTop(null);
  }

  function handleSeleccionarDesglose1(sel: EstVtasSeleccionDesglose | null) {
    setSeleccionDesglose1(sel);
    setSeleccionGrafico1(sel?.categoria ?? null);
    setSeleccionProductoTop(null);
  }

  function limpiarFiltros() {
    setFiltMarca(FILTRO_TODOS);
    setFiltRubro(FILTRO_TODOS);
    setFiltSubRubro(FILTRO_TODOS);
    setFiltColor(FILTRO_TODOS);
    setFiltTerminacion(FILTRO_TODOS);
    setFiltPresentacion(FILTRO_TODOS);
    setFiltSucursalId(FILTRO_TODOS);
    setFiltAnios([periodoDefault.anio]);
    setFiltMeses([periodoDefault.mes]);
    setFiltUnidad("unidad");
    setQ("");
    setQDebounced("");
  }

  return (
    <ClassicFilteredTableLayout
      title="ESTADÍSTICAS PRODUCTOS"
      subtitle="Ventas"
      contentWidth="full"
      filters={
        <div className="flex flex-col gap-2">
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtUnidad !== "unidad"}
                  onLimpiar={() => setFiltUnidad("unidad")}
                >
                  <Select
                    value={filtUnidad}
                    onValueChange={(v) => setFiltUnidad(v as EstVtasModoUnidad)}
                  >
                    <SelectTrigger
                      className="input-filtro-unificado"
                      aria-label="Unidades"
                    >
                      <SelectValue placeholder="UNIDADES" />
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

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={filtSucursalId !== FILTRO_TODOS}
                  onLimpiar={() => setFiltSucursalId(FILTRO_TODOS)}
                >
                  <Select value={filtSucursalId} onValueChange={setFiltSucursalId}>
                    <SelectTrigger
                      className="input-filtro-unificado"
                      aria-label="Sucursal"
                    >
                      <SelectValue placeholder="SUCURSAL" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro max-h-60"
                    >
                      <SelectItem value={FILTRO_TODOS}>SUCURSAL</SelectItem>
                      {sucursales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={cn(FILTER_SELECT_WRAPPER_CLASS, "relative")}
                  activo={aniosFiltroActivo}
                  onLimpiar={() => setFiltAnios([periodoDefault.anio])}
                >
                  <div className="relative" ref={aniosMultiRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setMesesOpen(false);
                        setMesesQuery("");
                        setAniosOpen((o) => {
                          const next = !o;
                          if (!next) setAniosQuery("");
                          return next;
                        });
                      }}
                      className={cn(
                        SELECT_TRIGGER_FILTER_CLASS,
                        "flex w-full items-center justify-between gap-2 text-left font-semibold"
                      )}
                      aria-expanded={aniosOpen}
                      aria-haspopup="listbox"
                      aria-label="Año (selección múltiple)"
                    >
                      <span className="truncate">{labelAnios}</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 opacity-50"
                        aria-hidden
                      />
                    </button>
                    {aniosOpen ? (
                      <div
                        className="absolute top-full left-0 z-50 mt-1 flex max-h-72 min-w-full flex-col overflow-hidden rounded-md border border-border bg-popover shadow-md"
                        role="listbox"
                        aria-multiselectable="true"
                      >
                        <div className="shrink-0 border-b border-border p-1">
                          <SelectSearchInput
                            value={aniosQuery}
                            onValueChange={setAniosQuery}
                            autoFocus
                          />
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-1">
                          {aniosFiltrados.length === 0 ? (
                            <p className="px-2 py-1.5 text-sm text-muted-foreground" role="status">
                              SIN RESULTADOS
                            </p>
                          ) : (
                            aniosFiltrados.map((a) => {
                              const selected = filtAnios.includes(a);
                              const conDatos = [...periodosConVentas].some((k) =>
                                k.startsWith(`${a}-`)
                              );
                              return (
                                <label
                                  key={a}
                                  role="option"
                                  aria-selected={selected}
                                  className={cn(
                                    "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted",
                                    selected && "bg-muted"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleAnio(a)}
                                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                                    aria-label={String(a)}
                                  />
                                  <span>
                                    {conDatos ? a : `${a} (SIN DATOS)`}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={cn(FILTER_SELECT_WRAPPER_CLASS, "relative")}
                  activo={mesesFiltroActivo}
                  onLimpiar={() => setFiltMeses([periodoDefault.mes])}
                >
                  <div className="relative" ref={mesesMultiRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setAniosOpen(false);
                        setAniosQuery("");
                        setMesesOpen((o) => {
                          const next = !o;
                          if (!next) setMesesQuery("");
                          return next;
                        });
                      }}
                      className={cn(
                        SELECT_TRIGGER_FILTER_CLASS,
                        "flex w-full items-center justify-between gap-2 text-left font-semibold"
                      )}
                      aria-expanded={mesesOpen}
                      aria-haspopup="listbox"
                      aria-label="Mes (selección múltiple)"
                    >
                      <span className="truncate">{labelMeses}</span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 opacity-50"
                        aria-hidden
                      />
                    </button>
                    {mesesOpen ? (
                      <div
                        className="absolute top-full left-0 z-50 mt-1 flex max-h-72 min-w-full flex-col overflow-hidden rounded-md border border-border bg-popover shadow-md"
                        role="listbox"
                        aria-multiselectable="true"
                      >
                        <div className="shrink-0 border-b border-border p-1">
                          <SelectSearchInput
                            value={mesesQuery}
                            onValueChange={setMesesQuery}
                            autoFocus
                          />
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-1">
                          {mesesFiltrados.length === 0 ? (
                            <p className="px-2 py-1.5 text-sm text-muted-foreground" role="status">
                              SIN RESULTADOS
                            </p>
                          ) : (
                            mesesFiltrados.map((m) => {
                              const selected = filtMeses.includes(m.valor);
                              return (
                                <label
                                  key={m.valor}
                                  role="option"
                                  aria-selected={selected}
                                  className={cn(
                                    "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted",
                                    selected && "bg-muted"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleMes(m.valor)}
                                    className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                                    aria-label={m.etiqueta}
                                  />
                                  <span>{m.etiqueta}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </FiltroIndividualContainer>

                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "gap-2")}>
                  <span className={FILTER_COUNT_CLASS}>
                    {filasFiltradas.length.toLocaleString("es-AR")} PRODUCTO
                    {filasFiltradas.length === 1 ? "" : "S"}
                  </span>
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>

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
                  placeholder="BUSCAR POR DESCRIPCIÓN..."
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
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <EstVtasGraficoVarianteBarras
          barras={barrasCategoria1}
          grupos={gruposGrafico1}
          dimension={dimension1}
          onDimensionChange={handleDimension1Change}
          desglose={desglose1}
          onDesgloseChange={handleDesglose1Change}
          seleccionada={desgloseActivo ? null : seleccionCategoria1Valida}
          onSeleccionar={
            desgloseActivo ? undefined : handleSeleccionarGrafico1
          }
          seleccionDesglose={seleccionDesgloseValida}
          onSeleccionarDesglose={
            desgloseActivo ? handleSeleccionarDesglose1 : undefined
          }
          sinVentasCargadas={ventas.length === 0}
          ariaLabelDimension="Dimensión del eje Y — gráfico 1"
          className="h-full max-h-full w-[35%] min-w-0 shrink-0 self-start"
        />
        <EstVtasGraficoTopProductos
          filas={barrasTopProductos}
          seleccionadoCod={seleccionProductoTopValida}
          onSeleccionar={setSeleccionProductoTop}
          sinVentasCargadas={ventas.length === 0}
          className="h-full max-h-full w-[30%] min-w-0 shrink-0 self-start"
        />
        <EstVtasGraficoBarrasMensual
          puntos={puntosMensuales}
          anio={filtAnios.length === 1 ? filtAnios[0]! : null}
          mesMarca={filtMeses.length === 1 ? filtMeses[0]! : null}
          sinVentasCargadas={ventas.length === 0}
          className="h-full max-h-full w-[35%] min-w-0 shrink-0 self-start"
        />
      </div>
    </ClassicFilteredTableLayout>
  );
}
