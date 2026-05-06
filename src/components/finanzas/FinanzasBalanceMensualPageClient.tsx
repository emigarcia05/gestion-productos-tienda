"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, PanelRightOpen, Pencil } from "lucide-react";
import FilterBar, {
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtPrecio } from "@/lib/format";
import {
  type BalanceMensualBloque,
  type BalanceMensualResumen,
  fmtMargenContribucionPct,
  puntoEquilibrioVentasPesos,
} from "@/lib/balanceMensual";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import EditarVentasBalanceMensualModal, {
  type EditarVentasBalanceMensualContext,
} from "@/components/finanzas/EditarVentasBalanceMensualModal";
import BalanceMensualDetallePorRubroModal from "@/components/finanzas/BalanceMensualDetallePorRubroModal";
import BalanceMensualDetalleGastosPorRubroModal from "@/components/finanzas/BalanceMensualDetalleGastosPorRubroModal";
import BalanceMensualDetalleGastosRubroModal from "@/components/finanzas/BalanceMensualDetalleGastosRubroModal";
import BalanceMensualGastoHistoricoModal from "@/components/finanzas/BalanceMensualGastoHistoricoModal";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import {
  agruparTiposYRubrosCostoMensual,
  BALANCE_MENSUAL_RUBRO_REPARTO_CC,
  listarGastosAgregadosPorRubroTipo,
  listarGastosDetalleRubro,
  totalMontoTipoEnCelda,
  type BalanceMensualColumnaDetalle,
  type BalanceMensualGastoAgregado,
  type ElegirRubroBalancePayload,
} from "@/lib/balanceMensualDetalle";
import { fmtTituloPalabras } from "@/lib/format";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";

const ANIO_FILTRO_MIN = 2026;
const ANIO_FILTRO_MAX = 2046;
const ANIOS_FILTRO = Array.from(
  { length: ANIO_FILTRO_MAX - ANIO_FILTRO_MIN + 1 },
  (_, i) => ANIO_FILTRO_MIN + i
);

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

function fmtMonto(n: number) {
  if (n === 0) return "—";
  return `$${fmtPrecio(n)}`;
}

function fmtMontoPe(b: BalanceMensualBloque) {
  const pe = puntoEquilibrioVentasPesos(b);
  if (pe === null) return "—";
  return `$${fmtPrecio(pe)}`;
}

function etiquetaPeriodoBalance(mes: number, anio: number): string {
  const m = MESES_CALENDARIO.find((x) => x.valor === mes)?.etiqueta.toLowerCase() ?? String(mes);
  return `${m} ${anio}`;
}

type ColumnaBalance = {
  key: string;
  titulo: string;
  bloque: BalanceMensualBloque;
  sucursalId: string | null;
};

/** Fondo más claro que el encabezado #0072BB, para filas de resultado. */
const BG_FILA_RESULTADO = "#a9d6f1";
const FG_FILA_RESULTADO = "#063652";

/**
 * Altura fija de cada fila del grid de balance mensual (referencia: «Resultado operativo», una línea).
 * Los botones de icono se escalan a este alto (`h-7 w-7`) para no estirar la fila.
 */
const CLASE_FILA_BALANCE_MENSUAL_GRID = "h-10 min-h-10 max-h-10";
const CLASE_CELDA_BALANCE_MENSUAL = "flex min-h-0 items-center px-3 py-0";
const CLASE_BOTON_ICONO_BALANCE_MENSUAL =
  "h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground";

type FilaBalance =
  | {
      id: string;
      tipo: "monto";
      etiquetaConcepto: ReactNode;
      get: (b: BalanceMensualBloque) => number;
      /** Negrita en celdas de importe (p. ej. ventas). */
      valorNegrita: boolean;
      /** Fila de subtotal resultado: fondo azul claro, concepto indentado, todo en negrita. */
      filaResultado?: boolean;
    }
  | {
      id: string;
      tipo: "texto";
      etiquetaConcepto: ReactNode;
      valor: (b: BalanceMensualBloque) => string;
      valorNegrita: boolean;
    };

const FILAS_BALANCE: FilaBalance[] = [
  {
    id: "ventas",
    tipo: "monto",
    etiquetaConcepto: "Ventas",
    get: (b) => b.ventas,
    valorNegrita: true,
  },
  {
    id: "cv",
    tipo: "monto",
    etiquetaConcepto: "Costo variable",
    get: (b) => b.costosVariables,
    valorNegrita: false,
  },
  {
    id: "ro",
    tipo: "monto",
    etiquetaConcepto: "RESULTADO OPERATIVO",
    get: (b) => b.resultadoOperativo,
    valorNegrita: false,
    filaResultado: true,
  },
  {
    id: "cf",
    tipo: "monto",
    etiquetaConcepto: "Costo fijo",
    get: (b) => b.costosFijos,
    valorNegrita: false,
  },
  {
    id: "re",
    tipo: "monto",
    etiquetaConcepto: "RESULTADO DEL EJERCICIO",
    get: (b) => b.resultadoEjercicio,
    valorNegrita: false,
    filaResultado: true,
  },
  {
    id: "mc",
    tipo: "texto",
    etiquetaConcepto: "Margen Contribución",
    valor: (b) => fmtMargenContribucionPct(b.margenContribucionPct),
    valorNegrita: false,
  },
  {
    id: "pe",
    tipo: "texto",
    etiquetaConcepto: "Punto de Equilibrio",
    valor: (b) => fmtMontoPe(b),
    valorNegrita: false,
  },
  {
    id: "mc_hist",
    tipo: "texto",
    etiquetaConcepto: "Margen Contribución Histórico",
    valor: () => "—",
    valorNegrita: false,
  },
  {
    id: "pe_hist",
    tipo: "texto",
    etiquetaConcepto: "Punto de Equilibrio Histórico",
    valor: () => "—",
    valorNegrita: false,
  },
];

function TablaBalanceMensualAlineada({
  columnas,
  mes,
  anio,
  puedeEditarVentas,
  onEditarVentas,
  onAbrirDetalleCostos,
}: {
  columnas: ColumnaBalance[];
  mes: number;
  anio: number;
  puedeEditarVentas: boolean;
  onEditarVentas: (ctx: EditarVentasBalanceMensualContext) => void;
  onAbrirDetalleCostos?: (payload: {
    tipo: "variables" | "fijos";
    columna: BalanceMensualColumnaDetalle;
    etiquetaColumna: string;
    totalCvCelda: number;
    totalCfCelda: number;
  }) => void;
}) {
  const nDatos = columnas.length;
  const gridTemplateColumns = `minmax(10.5rem, 1.05fr) repeat(${nDatos}, minmax(6.75rem, 1fr))`;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[min(100%,40rem)] min-w-[44rem]">
          <div
            className={cn(
              "grid border-b border-white/20 bg-[#0072BB] text-white",
              CLASE_FILA_BALANCE_MENSUAL_GRID
            )}
            style={{ gridTemplateColumns }}
          >
            <div
              className={cn(
                CLASE_CELDA_BALANCE_MENSUAL,
                "justify-center border-r border-white/20 px-2 px-3"
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                Concepto
              </span>
            </div>
            {columnas.map((c) => (
              <div
                key={c.key}
                className={cn(
                  CLASE_CELDA_BALANCE_MENSUAL,
                  "justify-center border-r border-white/20 text-center last:border-r-0"
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-white">
                  {c.titulo}
                </span>
              </div>
            ))}
          </div>
          {FILAS_BALANCE.map((fila) => {
            const esFilaResultado = fila.tipo === "monto" && Boolean(fila.filaResultado);
            const negritaValor =
              fila.tipo === "monto"
                ? fila.valorNegrita || esFilaResultado
                : fila.tipo === "texto" && fila.valorNegrita;

            return (
              <div
                key={fila.id}
                className={cn(
                  "grid border-b border-border/60 last:border-b-0",
                  CLASE_FILA_BALANCE_MENSUAL_GRID,
                  esFilaResultado && "border-[#0072BB]/25"
                )}
                style={{
                  gridTemplateColumns,
                  ...(esFilaResultado ? { backgroundColor: BG_FILA_RESULTADO } : {}),
                }}
              >
                <div
                  className={cn(
                    CLASE_CELDA_BALANCE_MENSUAL,
                    "border-r border-border/80 text-sm leading-none whitespace-nowrap",
                    esFilaResultado
                      ? "border-[#0072BB]/20 pl-10 font-bold"
                      : "font-normal text-foreground"
                  )}
                  style={esFilaResultado ? { color: FG_FILA_RESULTADO } : undefined}
                >
                  {fila.etiquetaConcepto}
                </div>
                {columnas.map((c) => {
                  const txt =
                    fila.tipo === "monto" ? fmtMonto(fila.get(c.bloque)) : fila.valor(c.bloque);
                  const sid = c.sucursalId;
                  const esColumnaSucursal = Boolean(sid);
                  const esFilaVentas = fila.id === "ventas";
                  const mostrarEditarVentas = esFilaVentas && puedeEditarVentas && Boolean(sid);
                  const mostrarDetalleDiscriminacion =
                    fila.tipo === "monto" && (fila.id === "cv" || fila.id === "cf") && Boolean(onAbrirDetalleCostos);

                  return (
                    <div
                      key={`${fila.id}-${c.key}`}
                      className={cn(
                        CLASE_CELDA_BALANCE_MENSUAL,
                        "justify-end border-r border-border/80 text-sm tabular-nums tracking-tight last:border-r-0",
                        esFilaResultado ? "border-[#0072BB]/20 font-bold" : "text-foreground"
                      )}
                      style={esFilaResultado ? { color: FG_FILA_RESULTADO } : undefined}
                    >
                      {esColumnaSucursal ? (
                        <div className="grid w-full min-w-0 grid-cols-[10%_90%] items-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={CLASE_BOTON_ICONO_BALANCE_MENSUAL}
                              aria-label={`Ver histórico — ${fila.etiquetaConcepto} — ${c.titulo}`}
                              title="Histórico (próximamente)"
                              disabled
                            >
                              <BarChart2 className="h-4 w-4" aria-hidden />
                            </Button>
                            {esFilaVentas && mostrarEditarVentas && sid ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={CLASE_BOTON_ICONO_BALANCE_MENSUAL}
                                aria-label={`Editar ventas — ${c.titulo}`}
                                onClick={() =>
                                  onEditarVentas({
                                    sucursalId: sid,
                                    nombreSucursal: c.titulo,
                                    mes,
                                    anio,
                                    ventaActual: c.bloque.ventas,
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </Button>
                            ) : null}
                            {mostrarDetalleDiscriminacion ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={CLASE_BOTON_ICONO_BALANCE_MENSUAL}
                                aria-label={`Ver discriminación — ${fila.etiquetaConcepto} — ${c.titulo}`}
                                onClick={() =>
                                  onAbrirDetalleCostos?.({
                                    tipo: fila.id === "cv" ? "variables" : "fijos",
                                    columna:
                                      c.key === "global"
                                        ? { ambito: "global" }
                                        : { ambito: "sucursal", nombre: c.titulo },
                                    etiquetaColumna: c.titulo,
                                    totalCvCelda: c.bloque.costosVariables,
                                    totalCfCelda: c.bloque.costosFijos,
                                  })
                                }
                              >
                                <PanelRightOpen className="h-4 w-4" aria-hidden />
                              </Button>
                            ) : null}
                          </div>
                          <div className="flex h-full min-w-0 items-center justify-end">
                            <span className={cn(negritaValor ? "font-bold" : "font-normal")}>{txt}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full min-w-0 items-center justify-end">
                          <span className={cn(negritaValor ? "font-bold" : "font-normal")}>
                            {txt}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  mes: number;
  anio: number;
  resumen: BalanceMensualResumen;
  filas: BalanceGastoMensualFila[];
  sucursalesGeneranBalance: { id: string; nombre: string }[];
  puedeEditarVentas: boolean;
}

type DetalleRubrosModalCtx = {
  columna: BalanceMensualColumnaDetalle;
  tipo: "variables" | "fijos";
  etiquetaColumna: string;
  totalCvCelda: number;
  totalCfCelda: number;
};

type DetalleGastosPorRubroModalCtx = DetalleRubrosModalCtx & {
  tipoGastoNombre: string | null;
  etiquetaTipo: string;
  rubroClave: string;
  tituloRubro: string;
  totalRubroSeccion: number;
};

type DetalleLineasGastoModalCtx = DetalleGastosPorRubroModalCtx & {
  gastoNombre: string;
  totalGastoAgregado: number;
};

export default function FinanzasBalanceMensualPageClient({
  mes,
  anio,
  resumen,
  filas,
  sucursalesGeneranBalance,
  puedeEditarVentas,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ventasModalOpen, setVentasModalOpen] = useState(false);
  const [ventasModalCtx, setVentasModalCtx] = useState<EditarVentasBalanceMensualContext | null>(null);
  const [detalleRubrosOpen, setDetalleRubrosOpen] = useState(false);
  const [detalleRubrosCtx, setDetalleRubrosCtx] = useState<DetalleRubrosModalCtx | null>(null);
  const [detalleGastosPorRubroOpen, setDetalleGastosPorRubroOpen] = useState(false);
  const [detalleGastosPorRubroCtx, setDetalleGastosPorRubroCtx] =
    useState<DetalleGastosPorRubroModalCtx | null>(null);
  const [detalleLineasGastoOpen, setDetalleLineasGastoOpen] = useState(false);
  const [detalleLineasGastoCtx, setDetalleLineasGastoCtx] =
    useState<DetalleLineasGastoModalCtx | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoGastoFinalId, setHistoricoGastoFinalId] = useState<string | null>(null);
  const [historicoDescripcion, setHistoricoDescripcion] = useState("");

  const seccionesTiposRubros = useMemo(() => {
    if (!detalleRubrosCtx) return [];
    return agruparTiposYRubrosCostoMensual(
      filas,
      sucursalesGeneranBalance,
      detalleRubrosCtx.columna,
      detalleRubrosCtx.tipo,
    );
  }, [detalleRubrosCtx, filas, sucursalesGeneranBalance]);

  const gastosAgregadosPorRubro = useMemo(() => {
    if (!detalleGastosPorRubroCtx) return [];
    return listarGastosAgregadosPorRubroTipo(
      filas,
      detalleGastosPorRubroCtx.columna,
      detalleGastosPorRubroCtx.tipo,
      detalleGastosPorRubroCtx.rubroClave,
      detalleGastosPorRubroCtx.tipoGastoNombre,
    );
  }, [detalleGastosPorRubroCtx, filas]);

  const filasLineasGastoDetalle = useMemo(() => {
    if (!detalleLineasGastoCtx) return [];
    return listarGastosDetalleRubro(
      filas,
      detalleLineasGastoCtx.columna,
      detalleLineasGastoCtx.tipo,
      detalleLineasGastoCtx.rubroClave,
      {
        tipoGastoNombre: detalleLineasGastoCtx.tipoGastoNombre,
        gastoNombre: detalleLineasGastoCtx.gastoNombre,
      },
    );
  }, [detalleLineasGastoCtx, filas]);

  function navegarPeriodo(nuevoMes: number, nuevoAnio: number) {
    const q = new URLSearchParams();
    q.set("mes", String(nuevoMes));
    q.set("anio", String(nuevoAnio));
    router.replace(`${pathname}?${q.toString()}`);
    router.refresh();
  }

  const { mesHoy, anioHoy } = useMemo(() => {
    const iso = dateToIsoYmdArgentina(new Date());
    const [yStr, mStr] = iso.split("-");
    const anioN = Number.parseInt(yStr ?? "", 10);
    const mesN = Number.parseInt(mStr ?? "", 10);
    return {
      mesHoy: Number.isFinite(mesN) ? mesN : 1,
      anioHoy: Number.isFinite(anioN) ? anioN : ANIO_FILTRO_MIN,
    };
  }, []);

  function limpiarFiltrosPeriodo() {
    navegarPeriodo(mesHoy, anioHoy);
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Balance"
        subtitle="Balance mensual"
        contentWidth="full"
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={anio !== anioHoy}
                  onLimpiar={() => navegarPeriodo(mes, anioHoy)}
                >
                  <Select value={String(anio)} onValueChange={(v) => navegarPeriodo(mes, parseInt(v, 10))}>
                    <SelectTrigger className="input-filtro-unificado" aria-label="Año del periodo">
                      <SelectValue placeholder="AÑO" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {ANIOS_FILTRO.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={mes !== mesHoy}
                  onLimpiar={() => navegarPeriodo(mesHoy, anio)}
                >
                  <Select
                    value={String(mes)}
                    onValueChange={(v) => navegarPeriodo(parseInt(v, 10), anio)}
                  >
                    <SelectTrigger className="input-filtro-unificado" aria-label="Mes del periodo">
                      <SelectValue placeholder="MES" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {MESES_CALENDARIO.map((m) => (
                        <SelectItem key={m.valor} value={String(m.valor)}>
                          {m.etiqueta}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>
                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-3")}>
                  <LimpiarFiltrosButton onClick={limpiarFiltrosPeriodo} />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
          {resumen.sucursales.length === 0 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
              No hay sucursales con <strong>genera_balance</strong> activo: solo se muestra el bloque
              global. Configurá al menos una sucursal en base de datos para ver el desglose.
            </p>
          ) : null}
          <TablaBalanceMensualAlineada
            columnas={[
              { key: "global", titulo: "Global", bloque: resumen.global, sucursalId: null },
              ...resumen.sucursales.map((s) => ({
                key: s.nombre,
                titulo: s.nombre,
                bloque: s.bloque,
                sucursalId: s.sucursalId || null,
              })),
            ]}
            mes={mes}
            anio={anio}
            puedeEditarVentas={puedeEditarVentas}
            onEditarVentas={(ctx) => {
              setVentasModalCtx(ctx);
              setVentasModalOpen(true);
            }}
            onAbrirDetalleCostos={(payload) => {
              setDetalleRubrosCtx(payload);
              setDetalleRubrosOpen(true);
            }}
          />
        </div>
      </ClassicFilteredTableLayout>
      <EditarVentasBalanceMensualModal
        open={ventasModalOpen}
        onOpenChange={(open) => {
          setVentasModalOpen(open);
          if (!open) setVentasModalCtx(null);
        }}
        ctx={ventasModalCtx}
        onSuccess={() => router.refresh()}
      />
      <BalanceMensualDetallePorRubroModal
        open={detalleRubrosOpen}
        onOpenChange={(open) => {
          setDetalleRubrosOpen(open);
          if (!open) setDetalleRubrosCtx(null);
        }}
        titulo={
          detalleRubrosCtx
            ? detalleRubrosCtx.tipo === "variables"
              ? "Costo variable por tipo y rubro"
              : "Costo fijo por tipo y rubro"
            : "Detalle por rubro"
        }
        subtitulo={
          detalleRubrosCtx
            ? `${detalleRubrosCtx.etiquetaColumna} · ${etiquetaPeriodoBalance(mes, anio)}`
            : ""
        }
        tipo={detalleRubrosCtx?.tipo ?? "variables"}
        totalCvCelda={detalleRubrosCtx?.totalCvCelda ?? 0}
        totalCfCelda={detalleRubrosCtx?.totalCfCelda ?? 0}
        secciones={seccionesTiposRubros}
        onElegirRubro={(payload: ElegirRubroBalancePayload) => {
          if (!detalleRubrosCtx) return;
          setDetalleGastosPorRubroCtx({
            ...detalleRubrosCtx,
            tipoGastoNombre: payload.tipoGastoNombre,
            etiquetaTipo: payload.etiquetaTipo,
            rubroClave: payload.rubro.clave,
            tituloRubro: payload.rubro.etiqueta,
            totalRubroSeccion: payload.rubro.monto,
          });
          setDetalleGastosPorRubroOpen(true);
        }}
      />
      <BalanceMensualDetalleGastosPorRubroModal
        open={detalleGastosPorRubroOpen}
        onOpenChange={(open) => {
          setDetalleGastosPorRubroOpen(open);
          if (!open) setDetalleGastosPorRubroCtx(null);
        }}
        titulo="Gastos por rubro"
        subtitulo={
          detalleGastosPorRubroCtx
            ? `${fmtTituloPalabras(detalleGastosPorRubroCtx.tituloRubro.toLowerCase())} · ${fmtTituloPalabras(
                detalleGastosPorRubroCtx.etiquetaTipo.toLowerCase(),
              )} · ${
                detalleGastosPorRubroCtx.tipo === "variables" ? "Costo variable" : "Costo fijo"
              } · ${detalleGastosPorRubroCtx.etiquetaColumna} · ${etiquetaPeriodoBalance(mes, anio)}`
            : ""
        }
        tipo={detalleGastosPorRubroCtx?.tipo ?? "variables"}
        totalCvCelda={detalleGastosPorRubroCtx?.totalCvCelda ?? 0}
        totalCfCelda={detalleGastosPorRubroCtx?.totalCfCelda ?? 0}
        totalRubroSeccion={detalleGastosPorRubroCtx?.totalRubroSeccion ?? 0}
        gastos={gastosAgregadosPorRubro}
        onElegirGasto={(g: BalanceMensualGastoAgregado) => {
          if (!detalleGastosPorRubroCtx) return;
          setDetalleLineasGastoCtx({
            ...detalleGastosPorRubroCtx,
            gastoNombre: g.gastoNombre,
            totalGastoAgregado: g.monto,
          });
          setDetalleLineasGastoOpen(true);
        }}
      />
      <BalanceMensualDetalleGastosRubroModal
        open={detalleLineasGastoOpen}
        onOpenChange={(open) => {
          setDetalleLineasGastoOpen(open);
          if (!open) setDetalleLineasGastoCtx(null);
        }}
        titulo={detalleLineasGastoCtx?.gastoNombre ?? "Líneas de gasto"}
        subtitulo={
          detalleLineasGastoCtx
            ? `${fmtTituloPalabras(detalleLineasGastoCtx.tituloRubro.toLowerCase())} · ${fmtTituloPalabras(
                detalleLineasGastoCtx.etiquetaTipo.toLowerCase(),
              )} · ${
                detalleLineasGastoCtx.tipo === "variables" ? "Costo variable" : "Costo fijo"
              } · ${detalleLineasGastoCtx.etiquetaColumna} · ${etiquetaPeriodoBalance(mes, anio)}`
            : ""
        }
        tipo={detalleLineasGastoCtx?.tipo ?? "variables"}
        totalGastoAgregado={detalleLineasGastoCtx?.totalGastoAgregado ?? 0}
        totalRubroSeccion={detalleLineasGastoCtx?.totalRubroSeccion ?? 0}
        totalPorTipo={(tipoNombre: string) =>
          detalleLineasGastoCtx
            ? totalMontoTipoEnCelda(
                filas,
                sucursalesGeneranBalance,
                detalleLineasGastoCtx.columna,
                detalleLineasGastoCtx.tipo,
                tipoNombre,
              )
            : 0
        }
        filas={filasLineasGastoDetalle}
        notaInformativa={
          detalleLineasGastoCtx?.rubroClave === BALANCE_MENSUAL_RUBRO_REPARTO_CC
            ? "Los importes son el total del mes imputado a cada centro de costo (sin balance). En la tabla del balance, ese total se reparte en partes iguales entre las sucursales que generan balance."
            : null
        }
        onAbrirHistorico={({ gastoFinalId, etiqueta }) => {
          setHistoricoGastoFinalId(gastoFinalId);
          setHistoricoDescripcion(etiqueta);
          setHistoricoOpen(true);
        }}
      />
      <BalanceMensualGastoHistoricoModal
        key={historicoGastoFinalId ?? "sin-gasto"}
        open={historicoOpen}
        onOpenChange={(open) => {
          setHistoricoOpen(open);
          if (!open) {
            setHistoricoGastoFinalId(null);
            setHistoricoDescripcion("");
          }
        }}
        gastoFinalId={historicoGastoFinalId}
        descripcion={historicoDescripcion}
      />
    </div>
  );
}
