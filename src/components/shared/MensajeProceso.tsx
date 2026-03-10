"use client";

import { cn } from "@/lib/utils";

/**
 * Detalle de progreso: texto "X de Y" con números formateados (locale es-AR).
 * Si solo se pasa un mensaje sin números, usar `detalle` como string.
 */
export type MensajeProcesoDetalle =
  | { procesados: number; total: number }
  | string
  | null
  | undefined;

export interface MensajeProcesoProps {
  /** Texto principal del estado (ej. "Sincronizando!", "Importando!", "Guardando!"). */
  mensaje: string;
  /**
   * Detalle opcional:
   * - `{ procesados, total }`: se muestra "X de Y" con formato locale.
   * - `string`: se muestra tal cual (ej. "…").
   * - null/undefined: no se muestra detalle.
   */
  detalle?: MensajeProcesoDetalle;
  /**
   * Variante visual (usa clases globales en globals.css):
   * - "default": .mensaje-proceso — bloque estándar para modales/páginas.
   * - "sidebar": .mensaje-proceso.mensaje-proceso--sidebar — compacto para barra lateral.
   * @default "default"
   */
  variant?: "default" | "sidebar";
  /** Clases CSS adicionales para el contenedor. */
  className?: string;
}

/**
 * Indicador de proceso en curso reutilizable.
 *
 * Usa únicamente clases globales (.mensaje-proceso, .mensaje-proceso__detalle,
 * .mensaje-proceso--sidebar) definidas en src/app/globals.css. No duplica estilos.
 *
 * @example
 * // Sidebar (sync)
 * <MensajeProceso variant="sidebar" mensaje="Sincronizando!" detalle={{ procesados: 100, total: 500 }} />
 *
 * @example
 * // Modal de importación
 * <MensajeProceso mensaje="Importando!" detalle="…" />
 *
 * @see docs/COMPONENTES_ESTILOS.md
 */
export default function MensajeProceso({
  mensaje,
  detalle,
  variant = "default",
  className,
}: MensajeProcesoProps) {
  const isSidebar = variant === "sidebar";
  const detailContent =
    detalle == null
      ? null
      : typeof detalle === "string"
        ? detalle
        : detalle.total > 0
          ? `${detalle.procesados.toLocaleString("es-AR")} de ${detalle.total.toLocaleString("es-AR")}`
          : "…";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mensaje-proceso",
        isSidebar && "mensaje-proceso--sidebar",
        className
      )}
    >
      {isSidebar ? (
        <>
          <span className="mensaje-proceso__linea1">{mensaje}</span>
          {detailContent != null ? (
            <span className="mensaje-proceso__detalle">{detailContent}</span>
          ) : (
            <span className="mensaje-proceso__detalle">…</span>
          )}
        </>
      ) : (
        <>
          {mensaje}
          {detailContent != null && (
            <>
              {" "}
              <span className="mensaje-proceso__detalle">{detailContent}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}
