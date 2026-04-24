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
import type { BalanceMensualBloque, BalanceMensualResumen } from "@/lib/balanceMensual";
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

function fmtPorcentaje(p: number | null) {
  if (p === null) return "—";
  return `${p.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function filaBalance({
  label,
  sublabel,
  detalle,
  value,
  valueClassName,
  className,
}: {
  label: ReactNode;
  sublabel?: ReactNode;
  /** Texto auxiliar bajo el sublabel (ej. ratio de margen). */
  detalle?: ReactNode;
  value: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-normal leading-snug text-foreground">{label}</div>
        {sublabel ? <div className="mt-0.5 text-xs font-normal leading-snug text-muted-foreground">{sublabel}</div> : null}
        {detalle ? <div className="mt-1.5 text-xs font-normal leading-snug text-muted-foreground">{detalle}</div> : null}
      </div>
      <div
        className={cn(
          "shrink-0 pt-0.5 text-right text-sm tabular-nums tracking-tight text-foreground",
          valueClassName ?? "font-normal"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function BloqueContable({
  titulo,
  b,
  headerEnd,
}: {
  titulo: string;
  b: BalanceMensualBloque;
  headerEnd?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/25 px-4 py-3">
        <h2 className="min-w-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {titulo}
        </h2>
        {headerEnd ? <div className="shrink-0">{headerEnd}</div> : null}
      </div>
      <div className="px-4 pb-1 pt-0.5">
        {filaBalance({
          label: "Ventas",
          value: fmtMonto(b.ventas),
          valueClassName: "font-bold",
          className: "bg-muted/15",
        })}
        {filaBalance({
          label: <span className="text-muted-foreground">− Costos variables</span>,
          value: fmtMonto(b.costosVariables),
        })}
        {filaBalance({
          label: "Resultado operativo",
          sublabel: "(Ventas − Costos variables)",
          detalle: <>Margen contribución / ventas: {fmtPorcentaje(b.margenContribucionPct)}</>,
          value: fmtMonto(b.resultadoOperativo),
          className: "border-border/80 bg-muted/10",
        })}
        {filaBalance({
          label: <span className="text-muted-foreground">− Costos fijos</span>,
          value: fmtMonto(b.costosFijos),
        })}
        {filaBalance({
          label: "Resultado ejercicio",
          sublabel: "(Resultado operativo − Costos fijos)",
          value: fmtMonto(b.resultadoEjercicio),
          valueClassName: "font-bold",
          className: "border-t border-border/80 bg-muted/15",
        })}
      </div>
    </section>
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
          <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
            <BloqueContable titulo="Global" b={resumen.global} />
            {resumen.sucursales.map(({ nombre, sucursalId, bloque }) => (
              <BloqueContable
                key={nombre}
                titulo={nombre}
                b={bloque}
                headerEnd={
                  puedeEditarVentas && sucursalId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Editar ventas — ${nombre}`}
                      onClick={() => {
                        setVentasModalCtx({
                          sucursalId,
                          nombreSucursal: nombre,
                          mes,
                          anio,
                          ventaActual: bloque.ventas,
                        });
                        setVentasModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null
                }
              />
            ))}
          </div>
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
