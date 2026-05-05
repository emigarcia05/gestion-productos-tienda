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

/**
 * Botón de **solo ícono** (o texto mínimo tipo +/−) en **celdas de tabla de gestión**.
 * **Obligatorio:** `variant="ghost"` + `size="icon"` + esta clase (anula el hover ghost).
 * Ver **FRONTEND_GUIDELINES** §1 — prohibición de `variant="outline"` + `size="icon-xs"` con aspecto documento.
 */
export const TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS =
  "h-9 w-9 shrink-0 rounded-md border-0 bg-[#0072BB] text-white shadow-none hover:bg-[#0072BB]/90 hover:text-white focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50";

/**
 * @deprecated En tablas de gestión las acciones por fila usan siempre {@link TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
 * (fondo #0072BB, ícono blanco). No combinar outline + icon-xs neutro.
 */
export const TABLE_ROW_ICON_BUTTON_CLASS = "disabled:cursor-not-allowed";

/**
 * @deprecated Las acciones destructivas en fila usan el mismo relleno corporativo que el resto;
 * no usar hover rojo en el botón (la confirmación sigue en modal o `confirm`).
 */
export const TABLE_ROW_ICON_BUTTON_DESTRUCTIVE_HOVER_CLASS =
  "hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive";

/** Tamaño uniforme del ícono dentro de botones de acción en tabla. */
export const TABLE_ROW_ACTION_ICON_CLASS = "h-4 w-4 shrink-0";
