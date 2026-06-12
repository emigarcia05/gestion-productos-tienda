"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import { fmtPrecio } from "@/lib/format";
import {
  CATALOGO_FINDER_ROW_INTERACTIVE_CLASS,
  CATALOGO_FINDER_ROW_SELECTED_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import type { ReferenciaCompetenciaPresentacion } from "@/services/categoriasComparacion.service";

interface Props {
  presentacionSeleccionada: boolean;
  loading: boolean;
  referenciasCompetencia: ReferenciaCompetenciaPresentacion[];
  referenciaActivaId: string | null;
  puedeEditar: boolean;
  quitarPendingId: string | null;
  onSelectReferenciaActiva: (refCompId: string) => void;
  onAgregarReferencia: () => void;
  onQuitarReferencia: (refCompId: string) => void;
}

const REFERENCIA_GRID_CLASS = "grid grid-cols-[10%_minmax(0,1fr)_10%] items-center gap-2";

export default function ComparacionReferenciaCompetenciaColumn({
  presentacionSeleccionada,
  loading,
  referenciasCompetencia,
  referenciaActivaId,
  puedeEditar,
  quitarPendingId,
  onSelectReferenciaActiva,
  onAgregarReferencia,
  onQuitarReferencia,
}: Props) {
  const cantidad = referenciasCompetencia.length;
  const subtitulo = !presentacionSeleccionada
    ? "Seleccioná una presentación"
    : loading
      ? "Cargando…"
      : cantidad === 0
        ? "Sin referencias"
        : `${cantidad} referencia${cantidad === 1 ? "" : "s"}`;

  const referenciaActiva = referenciasCompetencia.find((r) => r.id === referenciaActivaId) ?? null;
  const quitarActivaPending = referenciaActiva != null && quitarPendingId === referenciaActiva.id;

  return (
    <CatalogoFinderColumn
      titulo="REFERENCIA COMPETENCIA"
      subtitulo={subtitulo}
      mostrarNuevo={puedeEditar && presentacionSeleccionada && !loading}
      onNuevo={onAgregarReferencia}
      deshabilitada={!presentacionSeleccionada}
    >
      {!presentacionSeleccionada ? (
        <CatalogoFinderEmpty mensaje="Seleccioná una presentación para ver o editar referencias de competencia." />
      ) : loading ? (
        <div className="flex items-center justify-center px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Cargando referencias…
        </div>
      ) : cantidad === 0 ? (
        <CatalogoFinderEmpty mensaje="Sin referencias para calcular margen. Usá + Nuevo para agregar." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div
              className={cn(
                REFERENCIA_GRID_CLASS,
                "border-b bg-muted/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-foreground"
              )}
            >
              <span className="text-center">COMPETIDOR</span>
              <span>PRODUCTO</span>
              <span className="text-right">PX.</span>
            </div>
            {referenciasCompetencia.map((ref) => {
              const esActiva = referenciaActivaId === ref.id;
              const producto = ref.descripcionTienda ?? ref.codTienda;

              return (
                <div
                  key={ref.id}
                  className={cn(
                    REFERENCIA_GRID_CLASS,
                    "border-b px-3 py-2 text-xs",
                    CATALOGO_FINDER_ROW_INTERACTIVE_CLASS,
                    esActiva && CATALOGO_FINDER_ROW_SELECTED_CLASS
                  )}
                  onClick={() => onSelectReferenciaActiva(ref.id)}
                  role="button"
                  tabIndex={0}
                  data-selected={esActiva ? "true" : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectReferenciaActiva(ref.id);
                    }
                  }}
                >
                  <span
                    className={cn(
                      "text-center font-mono",
                      esActiva && "font-semibold text-primary"
                    )}
                  >
                    {ref.competenciaAbreviatura}
                  </span>
                  <span
                    className={cn("min-w-0 truncate", esActiva && "font-medium text-foreground")}
                    title={producto}
                  >
                    {producto}
                  </span>
                  <span
                    className={cn(
                      "text-right tabular-nums",
                      esActiva ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {ref.pxMostrar != null ? `$${fmtPrecio(ref.pxMostrar)}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          {puedeEditar && referenciaActiva && (
            <div className="shrink-0 border-t px-2 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full"
                onClick={() => onQuitarReferencia(referenciaActiva.id)}
                disabled={quitarActivaPending}
              >
                {quitarActivaPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Quitar referencia seleccionada"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </CatalogoFinderColumn>
  );
}
