"use client";

import { useEffect, useMemo, useState } from "react";
import SectionHeader from "@/components/SectionHeader";
import ProcesoInstructivoCarrusel from "@/components/procesos/ProcesoInstructivoCarrusel";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODULOS_PROCESOS,
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

  useEffect(() => {
    const first = procesosDelModulo[0]?.id ?? "";
    setProcesoId((actual) =>
      procesosDelModulo.some((p) => p.id === actual) ? actual : first
    );
  }, [procesosDelModulo]);

  const procesoSeleccionado = procesosDelModulo.find((p) => p.id === procesoId);

  const sinProcesos = procesosDelModulo.length === 0;

  return (
    <div className="area-page-shell flex h-screen min-h-0 flex-col overflow-hidden">
      <SectionHeader titulo="Gestión Productos" subtitulo="Procesos" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 pb-6 pt-2">
        <div className="grid min-h-0 flex-1 grid-cols-[25%_75%] gap-4">
          <div className="flex min-h-0 flex-col gap-3">
            <section
              className="flex h-[25%] min-h-[7.5rem] shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3"
              aria-labelledby="procesos-modulo-titulo"
            >
              <ModalMicroLabel id="procesos-modulo-titulo">Módulo</ModalMicroLabel>
              <Select
                value={moduloId}
                onValueChange={(v) => setModuloId(v as ModuloProcesosId)}
              >
                <SelectTrigger
                  className="input-filtro-unificado w-full font-semibold uppercase"
                  aria-label="Módulo de procesos"
                >
                  <SelectValue placeholder="MÓDULO" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="select-content-filtro"
                >
                  {MODULOS_PROCESOS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <nav
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2"
              aria-label="Procesos del módulo"
            >
              {sinProcesos ? (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No hay procesos disponibles para este módulo con tu rol.
                </p>
              ) : (
                procesosDelModulo.map((p) => {
                  const activo = p.id === procesoId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProcesoId(p.id)}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wide transition-colors",
                        activo
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "text-foreground hover:bg-muted"
                      )}
                      aria-current={activo ? "true" : undefined}
                    >
                      {p.labelCorto}
                    </button>
                  );
                })
              )}
            </nav>
          </div>

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
