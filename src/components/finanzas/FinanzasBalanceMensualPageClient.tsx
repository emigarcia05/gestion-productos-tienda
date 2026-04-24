"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
    }
  | { id: string; tipo: "espacio" };

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
    etiquetaConcepto: <span className="text-muted-foreground">Costo variable</span>,
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
    etiquetaConcepto: <span className="text-muted-foreground">Costo fijos</span>,
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
  { id: "gap1", tipo: "espacio" },
  { id: "gap2", tipo: "espacio" },
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
  { id: "gap3", tipo: "espacio" },
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
}: {
  columnas: ColumnaBalance[];
  mes: number;
  anio: number;
  puedeEditarVentas: boolean;
  onEditarVentas: (ctx: EditarVentasBalanceMensualContext) => void;
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
            if (fila.tipo === "espacio") {
              return (
                <div
                  key={fila.id}
                  className="grid border-b border-border/40 bg-card"
                  style={{ gridTemplateColumns }}
                >
                  <div className="h-6 border-r border-border/60" aria-hidden />
                  {columnas.map((c) => (
                    <div
                      key={`${fila.id}-${c.key}`}
                      className="h-6 border-r border-border/60 last:border-r-0"
                      aria-hidden
                    />
                  ))}
                </div>
              );
            }

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
  puedeEditarVentas: boolean;
}

export default function FinanzasBalanceMensualPageClient({
  mes,
  anio,
  resumen,
  puedeEditarVentas,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ventasModalOpen, setVentasModalOpen] = useState(false);
  const [ventasModalCtx, setVentasModalCtx] = useState<EditarVentasBalanceMensualContext | null>(null);

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
    </div>
  );
}
