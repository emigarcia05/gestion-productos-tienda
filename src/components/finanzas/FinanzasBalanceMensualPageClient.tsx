"use client";

import { usePathname, useRouter } from "next/navigation";
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

function BloqueContable({
  titulo,
  descripcion,
  b,
}: {
  titulo: string;
  descripcion: string;
  b: BalanceMensualBloque;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{titulo}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{descripcion}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <dt className="text-muted-foreground">Ventas</dt>
          <dd className="tabular-nums font-medium text-foreground">{fmtMonto(b.ventas)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <dt className="text-muted-foreground">− Costos variables</dt>
          <dd className="tabular-nums text-foreground">{fmtMonto(b.costosVariables)}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <dt className="font-medium text-foreground">= Resultado operativo</dt>
          <dd className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 text-right">
            <span className="tabular-nums font-semibold text-foreground">{fmtMonto(b.resultadoOperativo)}</span>
            <span className="text-xs text-muted-foreground">
              Margen contribución / ventas: {fmtPorcentaje(b.margenContribucionPct)}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
          <dt className="text-muted-foreground">− Costos fijos</dt>
          <dd className="tabular-nums text-foreground">{fmtMonto(b.costosFijos)}</dd>
        </div>
        <div className="flex justify-between gap-4 pt-1">
          <dt className="font-medium text-foreground">= Resultado ejercicio</dt>
          <dd className="tabular-nums font-semibold text-foreground">{fmtMonto(b.resultadoEjercicio)}</dd>
        </div>
      </dl>
    </section>
  );
}

interface Props {
  mes: number;
  anio: number;
  resumen: BalanceMensualResumen;
}

export default function FinanzasBalanceMensualPageClient({ mes, anio, resumen }: Props) {
  const router = useRouter();
  const pathname = usePathname();

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
          <p className="text-xs text-muted-foreground">
            Periodo <span className="font-medium text-foreground">{mes}/{anio}</span>. Costos según
            imputaciones de <strong className="font-medium text-foreground">Balance · Gastos</strong>{" "}
            (monto del mes). Ventas aún no integradas (0). Las tarjetas por sucursal corresponden a
            sucursales con <strong className="font-medium text-foreground">genera_balance</strong> en la tabla{" "}
            <span className="font-mono text-[11px] text-foreground/90">global_sucursales</span>. Los gastos
            imputados a sucursales con <strong className="font-medium text-foreground">centro_costo</strong>{" "}
            y sin generar balance se reparten en partes <strong className="font-medium text-foreground">iguales</strong>{" "}
            entre todas las que sí generan balance.
          </p>
          {resumen.sucursales.length === 0 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
              No hay sucursales con <strong>genera_balance</strong> activo: solo se muestra el bloque
              global. Configurá al menos una sucursal en base de datos para ver el desglose.
            </p>
          ) : null}
          <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
            <BloqueContable
              titulo="Global"
              descripcion="Todas las ventas y gastos del periodo, sin reparto entre sucursales."
              b={resumen.global}
            />
            {resumen.sucursales.map(({ nombre, bloque }) => (
              <BloqueContable
                key={nombre}
                titulo={nombre}
                descripcion="Imputaciones a esta sucursal más la parte igualitaria de centros de costo sin balance."
                b={bloque}
              />
            ))}
          </div>
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
