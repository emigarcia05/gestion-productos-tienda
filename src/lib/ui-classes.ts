/**
 * Clases Tailwind reutilizables basadas en tokens del tema (shadcn / globals.css).
 * Evita repetir `emerald-*`, `amber-*`, `blue-*` en componentes.
 */

/** Badge o chip de estado positivo (mapeo OK, importación completada). */
export const BADGE_SUCCESS_TINT_CLASS =
  "bg-primary/10 text-primary border-primary/20";

/** Texto de mensaje de éxito con ícono (lista, modal). */
export const TEXT_SUCCESS_CLASS = "text-primary";

/** Advertencias no destructivas (lista de advertencias en importación). */
export const TEXT_WARNING_CLASS = "text-accent2";

/** Botón/ícono de alerta suave (p. ej. diferencia de cantidades en historial de pedidos). */
export const ICON_WARNING_INTERACTIVE_CLASS =
  "inline-flex items-center justify-center rounded-sm text-accent2 outline-offset-2 hover:text-accent2/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

/** Badges del resumen numérico en ImportarModal (ResultStat). */
export const IMPORT_STAT_BADGE_CLASSES = {
  created: BADGE_SUCCESS_TINT_CLASS,
  updated: "bg-accent text-accent-foreground border-border",
  removed: "bg-accent2/10 text-accent2 border-accent2/20",
} as const;
