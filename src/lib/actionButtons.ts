/**
 * Botones de acción: referencian clases/tokens globales (SSOT en globals.css).
 * main button y header .section-header-actions button ya aplican dimensiones y variantes.
 * Estas constantes añaden solo lo necesario para variante primary/secondary sin duplicar estilos.
 */

/** Dimensiones base (alineado con globals: .btn-main / main button). */
export const MAIN_BUTTON_CLASSES =
  "h-10 min-h-10 px-4 rounded-lg font-semibold shadow-sm transition-[box-shadow,background-color,filter] duration-150 hover:shadow-md";

/** Secundarios: borde y texto desde variables (--border, --secondary-foreground). */
export const ACTION_BUTTON_SECONDARY =
  `${MAIN_BUTTON_CLASSES} border border-border text-secondary-foreground bg-secondary hover:brightness-[0.97]`;

/** Principal: colores desde :root (--primary, --primary-foreground). */
export const ACTION_BUTTON_PRIMARY =
  `${MAIN_BUTTON_CLASSES} bg-primary text-primary-foreground hover:brightness-90`;
