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

type FilaBalance =
  | {
      id: string;
      tipo: "monto";
      etiquetaConcepto: ReactNode;
      get: (b: BalanceMensualBloque) => number;
      valorNegrita: boolean;
      filaVentas: boolean;
      tonoFila?: "muted" | "acentuado";
    }
  | {
      id: string;
      tipo: "texto";
      etiquetaConcepto: ReactNode;
      valor: (b: BalanceMensualBloque) => string;
      valorNegrita: boolean;
      filaVentas: false;
      tonoFila?: "muted" | "acentuado";
    };

const FILAS_BALANCE: FilaBalance[] = [
  {
    id: "ventas",
    tipo: "monto",
    etiquetaConcepto: "Ventas",
    get: (b) => b.ventas,
    valorNegrita: true,
    filaVentas: true,
    tonoFila: "acentuado",
  },
  {
    id: "cv",
    tipo: "monto",
    etiquetaConcepto: <span className="text-muted-foreground">− Costos variables</span>,
    get: (b) => b.costosVariables,
    valorNegrita: false,
    filaVentas: false,
  },
  {
    id: "ro",
    tipo: "monto",
    etiquetaConcepto: "Resultado operativo",
    get: (b) => b.resultadoOperativo,
    valorNegrita: false,
    filaVentas: false,
    tonoFila: "muted",
  },
  {
    id: "mc",
    tipo: "texto",
    etiquetaConcepto: "Margen de contribución",
    valor: (b) => fmtMargenContribucionPct(b.margenContribucionPct),
    valorNegrita: false,
    filaVentas: false,
  },
  {
    id: "pe",
    tipo: "texto",
    etiquetaConcepto: "Punto de equilibrio",
    valor: (b) => fmtMontoPe(b),
    valorNegrita: false,
    filaVentas: false,
  },
  {
    id: "mc_hist",
    tipo: "texto",
    etiquetaConcepto: "Margen de contribución histórico",
    valor: () => "—",
    valorNegrita: false,
    filaVentas: false,
  },
  {
    id: "pe_hist",
    tipo: "texto",
    etiquetaConcepto: "Punto de equilibrio histórico",
    valor: () => "—",
    valorNegrita: false,
    filaVentas: false,
  },
  {
    id: "cf",
    tipo: "monto",
    etiquetaConcepto: <span className="text-muted-foreground">− Costos fijos</span>,
    get: (b) => b.costosFijos,
    valorNegrita: false,
    filaVentas: false,
  },
  {
    id: "re",
    tipo: "monto",
    etiquetaConcepto: "Resultado ejercicio",
    get: (b) => b.resultadoEjercicio,
    valorNegrita: true,
    filaVentas: false,
    tonoFila: "acentuado",
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
            className="grid border-b border-border"
            style={{ gridTemplateColumns }}
          >
            <div className="flex items-center justify-center border-r border-border/80 bg-surface px-2 py-2.5 sm:px-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Concepto
              </span>
            </div>
            {columnas.map((c) => (
              <div
                key={c.key}
                className="border-r border-border/80 bg-surface px-3 py-2.5 text-center last:border-r-0"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {c.titulo}
                </span>
              </div>
            ))}
          </div>
          {FILAS_BALANCE.map((fila) => (
            <div
              key={fila.id}
              className={cn(
                "grid border-b border-border/60 last:border-b-0",
                fila.tonoFila === "muted" && "bg-muted/15",
                fila.tonoFila === "acentuado" && "bg-muted/25"
              )}
              style={{ gridTemplateColumns }}
            >
              <div className="flex items-center border-r border-border/80 px-3 py-2.5 text-sm font-normal leading-snug text-foreground">
                {fila.filaVentas ? (
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {columnas.map((c) => {
                      const sid = c.sucursalId;
                      if (!puedeEditarVentas || !sid) return null;
                      return (
                        <Button
                          key={`edit-ventas-${c.key}`}
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
                      );
                    })}
                    {fila.etiquetaConcepto}
                  </div>
                ) : (
                  fila.etiquetaConcepto
                )}
              </div>
              {columnas.map((c) => {
                const txt =
                  fila.tipo === "monto" ? fmtMonto(fila.get(c.bloque)) : fila.valor(c.bloque);
                const negrita = fila.valorNegrita;

                return (
                  <div
                    key={`${fila.id}-${c.key}`}
                    className="border-r border-border/80 px-3 py-2.5 text-right text-sm tabular-nums tracking-tight text-foreground last:border-r-0"
                  >
                    <span className={cn(negrita ? "font-bold" : "font-normal")}>{txt}</span>
                  </div>
                );
              })}
            </div>
          ))}
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
