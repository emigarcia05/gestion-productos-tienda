"use client";

import MktRedSocialIcon from "@/components/marketing/MktRedSocialIcon";
import type { MktCuadroMandoStats, MktStatFila } from "@/lib/mktPublicacionesEstadisticas";
import { cn } from "@/lib/utils";

function ColumnaStats({
  titulo,
  filas,
  mostrarIconoRed,
}: {
  titulo: string;
  filas: MktStatFila[];
  mostrarIconoRed?: boolean;
}) {
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-card"
      aria-label={titulo}
    >
      <header className="shrink-0 border-b border-border bg-primary px-3 py-2 text-center">
        <h3 className="text-xs font-bold uppercase tracking-wide text-primary-foreground">
          {titulo}
        </h3>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {filas.length === 0 ? (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">Sin datos</li>
        ) : (
          filas.map((fila) => (
            <li
              key={fila.id}
              className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
            >
              {mostrarIconoRed ? (
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <MktRedSocialIcon redNombre={fila.nombre} className="size-3.5" />
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {fila.nombre}
              </span>
              <span
                className={cn(
                  "tabular-nums text-sm font-semibold",
                  fila.cantidad > 0 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {fila.cantidad}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

/** Tres columnas: Redes · Tipo · Contenido (Planificado / Terminado). */
export default function MktPublicacionesCuadroMando({
  stats,
}: {
  stats: MktCuadroMandoStats;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-2 px-8 pb-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">Cuadro De Mando</h2>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {stats.total} Publicacion(es) Del Mes
        </p>
      </div>
      <div className="grid min-h-[10rem] grid-cols-3 gap-3">
        <ColumnaStats titulo="Redes" filas={stats.redes} mostrarIconoRed />
        <ColumnaStats titulo="Tipo" filas={stats.tipos} />
        <ColumnaStats titulo="Contenido" filas={stats.contenido} />
      </div>
    </div>
  );
}
