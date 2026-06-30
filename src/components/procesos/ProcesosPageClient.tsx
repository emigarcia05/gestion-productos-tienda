"use client";

import { useMemo, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import ProcesoInstructivoCarrusel from "@/components/procesos/ProcesoInstructivoCarrusel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODULOS_PROCESOS,
  formatoTituloProcesos,
  listarProcesosVisiblesPorModulo,
  type ModuloProcesosId,
} from "@/lib/procesos-instructivos";
import type { Rol } from "@/lib/permisos";
import { cn } from "@/lib/utils";

interface Props {
  rol: Rol;
}

export default function ProcesosPageClient({ rol }: Props) {
  const [moduloId, setModuloId] = useState<ModuloProcesosId>("importacion-dux");

  const procesosDelModulo = useMemo(
    () => listarProcesosVisiblesPorModulo(moduloId, rol),
    [moduloId, rol]
  );

  const [procesoId, setProcesoId] = useState<string>("");

  const procesoIdEfectivo = useMemo(() => {
    const first = procesosDelModulo[0]?.id ?? "";
    if (procesoId && procesosDelModulo.some((p) => p.id === procesoId)) {
      return procesoId;
    }
    return first;
  }, [procesoId, procesosDelModulo]);

  const procesoSeleccionado = procesosDelModulo.find((p) => p.id === procesoIdEfectivo);

  const sinProcesos = procesosDelModulo.length === 0;

  return (
    <div className="area-page-shell">
      <SectionHeader titulo="Ayuda Vendedor" subtitulo="Procesos" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-6 pt-2">
        <div className="grid min-h-0 flex-1 grid-cols-[25%_75%] gap-4">
          <aside
            className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-3"
            aria-labelledby="procesos-modulo-titulo"
          >
            <div className="flex shrink-0 flex-col gap-2">
              <h2
                id="procesos-modulo-titulo"
                className="shrink-0 text-center text-base font-semibold capitalize text-foreground"
              >
                Módulo
              </h2>
              <Select
                value={moduloId}
                onValueChange={(v) => setModuloId(v as ModuloProcesosId)}
              >
                <SelectTrigger
                  className="input-filtro-unificado w-full font-semibold capitalize"
                  aria-label="Módulo de procesos"
                >
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {MODULOS_PROCESOS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {formatoTituloProcesos(m.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <nav
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
              aria-label="Procesos del módulo"
            >
              {sinProcesos ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No hay procesos disponibles para este módulo con tu rol.
                </p>
              ) : (
                procesosDelModulo.map((p) => {
                  const activo = p.id === procesoIdEfectivo;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProcesoId(p.id)}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-left text-sm font-semibold capitalize tracking-wide transition-colors",
                        activo
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "text-foreground hover:bg-muted"
                      )}
                      aria-current={activo ? "true" : undefined}
                    >
                      {formatoTituloProcesos(p.labelCorto)}
                    </button>
                  );
                })
              )}
            </nav>
          </aside>

          <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card p-4">
            {procesoSeleccionado ? (
              <ProcesoInstructivoCarrusel
                titulo={procesoSeleccionado.tituloGuia}
                pasos={procesoSeleccionado.pasos}
                resetKey={procesoSeleccionado.id}
                className="min-h-0 flex-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {sinProcesos
                  ? "Elegí otro módulo o pedí acceso a los procesos necesarios."
                  : "Elegí un proceso del listado."}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
