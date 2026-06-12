"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import { fmtPrecio } from "@/lib/format";
import type { ReferenciaCompetenciaPresentacion } from "@/services/categoriasComparacion.service";

interface Props {
  presentacionSeleccionada: boolean;
  loading: boolean;
  referenciaCompetencia: ReferenciaCompetenciaPresentacion | null;
  puedeEditar: boolean;
  quitarPending: boolean;
  onElegirReferencia: () => void;
  onQuitarReferencia: () => void;
}

export default function ComparacionReferenciaCompetenciaColumn({
  presentacionSeleccionada,
  loading,
  referenciaCompetencia,
  puedeEditar,
  quitarPending,
  onElegirReferencia,
  onQuitarReferencia,
}: Props) {
  const subtitulo = !presentacionSeleccionada
    ? "Seleccioná una presentación"
    : loading
      ? "Cargando…"
      : referenciaCompetencia
        ? "Referencia asignada"
        : "Sin referencia";

  return (
    <CatalogoFinderColumn
      titulo="REFERENCIA COMPETENCIA"
      subtitulo={subtitulo}
      mostrarNuevo={false}
      deshabilitada={!presentacionSeleccionada}
    >
      {!presentacionSeleccionada ? (
        <CatalogoFinderEmpty mensaje="Seleccioná una presentación para ver o editar la referencia de competencia." />
      ) : loading ? (
        <div className="flex items-center justify-center px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Cargando referencia…
        </div>
      ) : referenciaCompetencia ? (
        <div className="flex flex-col gap-3 px-3 py-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-snug text-foreground">
              {referenciaCompetencia.etiqueta}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {referenciaCompetencia.pxMostrar != null
                ? `$${fmtPrecio(referenciaCompetencia.pxMostrar)}`
                : "—"}
            </p>
          </div>
          {puedeEditar && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onElegirReferencia}
              >
                Cambiar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onQuitarReferencia}
                disabled={quitarPending}
              >
                {quitarPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Quitar"
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-3 py-3">
          <p className="text-sm text-muted-foreground leading-snug">
            Sin referencia para calcular margen
          </p>
          {puedeEditar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-fit"
              onClick={onElegirReferencia}
            >
              Elegir referencia
            </Button>
          )}
        </div>
      )}
    </CatalogoFinderColumn>
  );
}
