"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import { fmtPrecio } from "@/lib/format";
import {
  CATALOGO_FINDER_ROW_INTERACTIVE_CLASS,
  CATALOGO_FINDER_ROW_SELECTED_CLASS,
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
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

/** COMP. 15 % · PRODUCTO 70 % · PX 10 % · acción 5 % */
const REFERENCIA_GRID_CLASS = "grid grid-cols-[15fr_70fr_10fr_5fr] items-center gap-1.5";

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

  return (
    <CatalogoFinderColumn
      titulo="REFERENCIA COMPETENCIA"
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              REFERENCIA_GRID_CLASS,
              "border-b bg-muted/60 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-foreground"
            )}
          >
            <span className="text-center">COMP.</span>
            <span>PRODUCTO</span>
            <span className="text-right">PX.</span>
            <span className="sr-only">Acciones</span>
          </div>
          {referenciasCompetencia.map((ref) => {
            const esActiva = referenciaActivaId === ref.id;
            const producto = ref.descripcionTienda ?? ref.codTienda;
            const quitarPending = quitarPendingId === ref.id;

            return (
              <div
                key={ref.id}
                className={cn(
                  REFERENCIA_GRID_CLASS,
                  "border-b px-2 py-2 text-xs",
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
                    "text-center font-mono text-[11px]",
                    esActiva && "font-semibold text-primary"
                  )}
                >
                  {ref.competenciaAbreviatura}
                </span>
                <span
                  className={cn(
                    "min-w-0 line-clamp-2 break-words leading-snug",
                    esActiva && "font-medium text-foreground"
                  )}
                  title={producto}
                >
                  {producto}
                </span>
                <span
                  className={cn(
                    "text-right tabular-nums text-[11px]",
                    esActiva ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {ref.pxMostrar != null ? `$${fmtPrecio(ref.pxMostrar)}` : "—"}
                </span>
                <span className="flex justify-center">
                  {puedeEditar ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
                        "!size-6 max-h-6 min-h-6 min-w-6 shrink-0 !p-0"
                      )}
                      disabled={quitarPending}
                      title="Quitar referencia"
                      aria-label={`Quitar referencia ${producto}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuitarReferencia(ref.id);
                      }}
                    >
                      {quitarPending ? (
                        <Loader2
                          className={cn(TABLE_ROW_ACTION_ICON_CLASS, "animate-spin")}
                          aria-hidden
                        />
                      ) : (
                        <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                      )}
                    </Button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </CatalogoFinderColumn>
  );
}
