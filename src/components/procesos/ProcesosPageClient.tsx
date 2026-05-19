"use client";

import { useMemo, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import ProcesoInstructivoCarrusel from "@/components/procesos/ProcesoInstructivoCarrusel";
import { PROCESOS_INSTRUCTIVOS } from "@/lib/procesos-instructivos";
import type { Rol } from "@/lib/permisos";
import { puede } from "@/lib/permisos";
import { cn } from "@/lib/utils";

interface Props {
  rol: Rol;
}

export default function ProcesosPageClient({ rol }: Props) {
  const procesosVisibles = useMemo(
    () => PROCESOS_INSTRUCTIVOS.filter((p) => puede(rol, p.permiso)),
    [rol]
  );

  const [procesoId, setProcesoId] = useState<string>(
    () => procesosVisibles[0]?.id ?? ""
  );

  const procesoSeleccionado = procesosVisibles.find((p) => p.id === procesoId);

  return (
    <div className="area-page-shell flex h-screen min-h-0 flex-col overflow-hidden">
      <SectionHeader titulo="Gestión Productos" subtitulo="Procesos" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-8 pb-6 pt-2">
        {procesosVisibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tenés procesos disponibles con tu rol actual.
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(14rem,22rem)_1fr] gap-6">
            <nav
              className="flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-card p-2"
              aria-label="Listado de procesos"
            >
              {procesosVisibles.map((p) => {
                const activo = p.id === procesoId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProcesoId(p.id)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-left transition-colors",
                      activo
                        ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                        : "text-foreground hover:bg-muted"
                    )}
                    aria-current={activo ? "true" : undefined}
                  >
                    <span className="block text-sm font-semibold leading-snug">
                      {p.titulo}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.origen}
                    </span>
                  </button>
                );
              })}
            </nav>

            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card p-4">
              {procesoSeleccionado ? (
                <>
                  <p className="mb-4 shrink-0 text-sm text-muted-foreground">
                    {procesoSeleccionado.descripcion}
                  </p>
                  <ProcesoInstructivoCarrusel
                    titulo="Importar El Archivo Exportado En DUX"
                    pasos={procesoSeleccionado.pasos}
                    resetKey={procesoSeleccionado.id}
                    className="min-h-0 flex-1"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Elegí un proceso del listado.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
