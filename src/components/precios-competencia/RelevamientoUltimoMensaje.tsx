"use client";

import {
  ESTADO_RELEVAMIENTO_COMPETENCIA,
  etiquetaEstadoRelevamiento,
} from "@/lib/competenciaRelevamiento";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

const MENSAJE_SIN_PRECIO =
  "La página se descargó pero no se detectó precio. Revisá selectores, regex o tipo de página en Configuracion Competidor.";

function formatearRelevadoAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface Props {
  vinculo: DatoVinculoCompetenciaCliente | undefined;
  /** Si hay URL cargada pero aún no se comparó. */
  tieneUrlEnEdicion?: boolean;
}

/**
 * Muestra el último resultado de comparación (estado + mensaje) para copiar y depurar.
 */
export default function RelevamientoUltimoMensaje({ vinculo, tieneUrlEnEdicion }: Props) {
  if (!vinculo?.urlProducto?.trim() && !tieneUrlEnEdicion) return null;

  const estado = vinculo?.estado ?? ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE;
  const relevado = formatearRelevadoAt(vinculo?.relevadoAt ?? null);

  if (estado === ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE) {
    return (
      <p className="text-xs text-muted-foreground">
        {relevado
          ? `Último registro: pendiente de comparar (${relevado}).`
          : "Pendiente: ejecutá Comparar Precios para relevar el precio."}
      </p>
    );
  }

  if (estado === ESTADO_RELEVAMIENTO_COMPETENCIA.OK) {
    if (!relevado) return null;
    return (
      <p className="text-xs text-muted-foreground">
        Última comparación OK{relevado ? ` · ${relevado}` : ""}.
      </p>
    );
  }

  const esError = estado === ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR;
  const texto =
    esError && vinculo?.errorMensaje?.trim()
      ? vinculo.errorMensaje.trim()
      : estado === ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO
        ? MENSAJE_SIN_PRECIO
        : vinculo?.errorMensaje?.trim() || null;

  if (!texto) return null;

  return (
    <div
      className={
        esError
          ? "rounded-md border border-destructive/35 bg-destructive/5 px-2.5 py-2 text-xs"
          : "rounded-md border border-amber-500/35 bg-amber-500/5 px-2.5 py-2 text-xs"
      }
      role="status"
    >
      <p className="font-medium text-foreground">
        Último intento: {etiquetaEstadoRelevamiento(estado)}
        {relevado ? ` · ${relevado}` : ""}
      </p>
      <p
        className="mt-1 font-mono text-[11px] leading-snug text-foreground/90 break-words select-all"
        title="Seleccioná y copiá para depurar con Configuracion Competidor o una IA"
      >
        {texto}
      </p>
    </div>
  );
}
