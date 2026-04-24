"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelRightOpen, Pencil } from "lucide-react";
import FilterBar, {
  FILTER_SELECT_WRAPPER_CLASS,
  FilaFiltrosDesplegables,
  FilterRowSelection,
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
import BalanceMensualDetalleGastosRubroModal from "@/components/finanzas/BalanceMensualDetalleGastosRubroModal";
import type { BalanceGastoMensualFila } from "@/services/finBalGastoMensualBalance.service";
import {
  agruparRubrosCostoMensual,
  BALANCE_MENSUAL_RUBRO_REPARTO_CC,
  listarGastosDetalleRubro,
  type BalanceMensualColumnaDetalle,
  type BalanceMensualRubroAgrupado,
} from "@/lib/balanceMensualDetalle";

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
    etiquetaConcepto: "Resultado operativo",
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
    etiquetaConcepto: "Resultado ejercicio",
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
        <div className="min-w-[min(100%,40rem)] sm:min-w-[44rem]">
          <div
            className="grid border-b border-white/20 bg-[#0072BB] text-white"
            style={{ gridTemplateColumns }}
          >
            <div className="flex items-center justify-center border-r border-white/20 px-2 py-2.5 sm:px-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                Concepto
              </span>
            </div>
            {columnas.map((c) => (
              <div
                key={c.key}
                className="border-r border-white/20 px-3 py-2.5 text-center last:border-r-0"
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
                  esFilaResultado && "border-[#0072BB]/25"
                )}
                style={{
                  gridTemplateColumns,
                  ...(esFilaResultado ? { backgroundColor: BG_FILA_RESULTADO } : {}),
                }}
              >
                <div
                  className={cn(
                    "flex items-center border-r border-border/80 px-3 py-2.5 text-sm leading-snug",
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
                  const esFilaVentas = fila.id === "ventas";
                  const mostrarEditarVentas = esFilaVentas && puedeEditarVentas && Boolean(sid);

                  return (
                    <div
                      key={`${fila.id}-${c.key}`}
                      className={cn(
                        "border-r border-border/80 px-3 py-2.5 text-sm tabular-nums tracking-tight last:border-r-0",
                        esFilaResultado ? "border-[#0072BB]/20 font-bold" : "text-foreground"
                      )}
                      style={esFilaResultado ? { color: FG_FILA_RESULTADO } : undefined}
                    >
                      {esFilaVentas ? (
                        <div className="grid w-full grid-cols-[1fr_2.25rem] items-center gap-x-1">
                          <span
                            className={cn(
                              "min-w-0 text-right",
                              negritaValor ? "font-bold" : "font-normal"
                            )}
                          >
                            {txt}
                          </span>
                          <div className="flex justify-end">
                            {mostrarEditarVentas && sid ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
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
                            ) : (
                              <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
                            )}
                          </div>
                        </div>
                      ) : fila.tipo === "monto" &&
                        (fila.id === "cv" || fila.id === "cf") &&
                        onAbrirDetalleCostos ? (
                        <div className="grid w-full grid-cols-[1fr_2.25rem] items-center gap-x-1">
                          <span
                            className={cn(
                              "min-w-0 text-right",
                              negritaValor ? "font-bold" : "font-normal"
                            )}
                          >
                            {txt}
                          </span>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label={`Ver detalle por rubro — ${fila.etiquetaConcepto} — ${c.titulo}`}
                              onClick={() =>
                                onAbrirDetalleCostos({
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
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
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

type DetalleGastosModalCtx = DetalleRubrosModalCtx & {
  rubroClave: string;
  tituloRubro: string;
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
  const [detalleGastosOpen, setDetalleGastosOpen] = useState(false);
  const [detalleGastosCtx, setDetalleGastosCtx] = useState<DetalleGastosModalCtx | null>(null);

  const rubrosDetalle = useMemo(() => {
    if (!detalleRubrosCtx) return [];
    return agruparRubrosCostoMensual(
      filas,
      sucursalesGeneranBalance,
      detalleRubrosCtx.columna,
      detalleRubrosCtx.tipo,
    );
  }, [detalleRubrosCtx, filas, sucursalesGeneranBalance]);

  const filasGastosDetalle = useMemo(() => {
    if (!detalleGastosCtx) return [];
    return listarGastosDetalleRubro(
      filas,
      detalleGastosCtx.columna,
      detalleGastosCtx.tipo,
      detalleGastosCtx.rubroClave,
    );
  }, [detalleGastosCtx, filas]);

  function navegarPeriodo(nuevoMes: number, nuevoAnio: number) {
    const q = new URLSearchParams();
    q.set("mes", String(nuevoMes));
    q.set("anio", String(nuevoAnio));
    router.replace(`${pathname}?${q.toString()}`);
    router.refresh();
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
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
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
                </div>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
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
              ? "Costo variable por rubro"
              : "Costo fijo por rubro"
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
        rubros={rubrosDetalle}
        onElegirRubro={(r: BalanceMensualRubroAgrupado) => {
          if (!detalleRubrosCtx) return;
          setDetalleGastosCtx({
            ...detalleRubrosCtx,
            rubroClave: r.clave,
            tituloRubro: r.etiqueta,
          });
          setDetalleGastosOpen(true);
        }}
      />
      <BalanceMensualDetalleGastosRubroModal
        open={detalleGastosOpen}
        onOpenChange={(open) => {
          setDetalleGastosOpen(open);
          if (!open) setDetalleGastosCtx(null);
        }}
        titulo={detalleGastosCtx?.tituloRubro ?? "Detalle de gastos"}
        subtitulo={
          detalleGastosCtx
            ? `${
                detalleGastosCtx.tipo === "variables" ? "Costo variable" : "Costo fijo"
              } · ${detalleGastosCtx.etiquetaColumna} · ${etiquetaPeriodoBalance(mes, anio)}`
            : ""
        }
        tipo={detalleGastosCtx?.tipo ?? "variables"}
        totalCvCelda={detalleGastosCtx?.totalCvCelda ?? 0}
        totalCfCelda={detalleGastosCtx?.totalCfCelda ?? 0}
        filas={filasGastosDetalle}
        notaInformativa={
          detalleGastosCtx?.rubroClave === BALANCE_MENSUAL_RUBRO_REPARTO_CC
            ? "Los importes son el total del mes imputado a cada centro de costo (sin balance). En la tabla del balance, ese total se reparte en partes iguales entre las sucursales que generan balance."
            : null
        }
      />
    </div>
  );
}
