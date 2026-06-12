/**
 * Clases Tailwind reutilizables basadas en tokens del tema (shadcn / globals.css).
 * Evita repetir `emerald-*`, `amber-*`, `blue-*` en componentes.
 */

/** Badge o chip de estado positivo (mapeo OK, importación completada). */
export const BADGE_SUCCESS_TINT_CLASS =
  "bg-primary/10 text-primary border-primary/20";

/** Fila clickeable en columnas `catalogo-finder` (Categoría, Referencia competencia, etc.). */
export const CATALOGO_FINDER_ROW_INTERACTIVE_CLASS =
  "cursor-pointer transition-colors hover:bg-accent/50";

/** Fila seleccionada (una sola activa): azul claro de marca, igual que `CatalogoFinderRow`. */
export const CATALOGO_FINDER_ROW_SELECTED_CLASS =
  "bg-primary/10 hover:bg-primary/15";

/** Texto de mensaje de éxito con ícono (lista, modal). */
export const TEXT_SUCCESS_CLASS = "text-primary";

/** Advertencias no destructivas (lista de advertencias en importación). */
export const TEXT_WARNING_CLASS = "text-accent2";

/** Botón/ícono de alerta suave (p. ej. diferencia de cantidades en historial de pedidos). */
export const ICON_WARNING_INTERACTIVE_CLASS =
  "inline-flex items-center justify-center rounded-sm text-accent2 outline-offset-2 hover:text-accent2/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Callout/banner de advertencia no destructiva (p. ej. avisos de configuración faltante en Balance mensual).
 * Reusa la familia `accent2` (amarillo de marca) sin acoplarse a paletas genéricas como `amber-*`.
 */
export const CALLOUT_WARNING_CLASS =
  "rounded-md border border-accent2/40 bg-accent2/10 px-3 py-2 text-xs text-foreground";

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
/** Botón #0072BB en fila de tabla: cuadrado (ancho = alto), encaja al alto útil del contenedor + `p-*` del wrapper. */
export const TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS =
  "tabla-row-btn-filled-brand aspect-square !h-full max-h-full !w-auto max-w-full min-h-0 min-w-0 self-center shrink-0 rounded-md border-0 bg-[#0072BB] text-white shadow-none hover:bg-[#0072BB]/90 hover:text-white focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50";

/**
 * Contenedor flex en celdas con botones {@link TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}.
 * `p-1.5` + `items-center` dejan aire respecto del borde de la celda; el botón cuadrado usa el alto interno.
 */
export const TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS =
  "flex h-full min-h-0 w-full flex-wrap items-center justify-center gap-1.5 box-border p-1.5";

/** Tamaño uniforme del ícono dentro de botones de acción en tabla. */
export const TABLE_ROW_ACTION_ICON_CLASS = "h-4 w-4 shrink-0";

/**
 * Columna **Hist.** en modales de drill-down del balance mensual (borde #0072BB + fondo suave).
 * Usar con {@link BALANCE_MODAL_TH_HISTORIAL_CLASS}, {@link BALANCE_MODAL_TD_HISTORIAL_CLASS} y
 * {@link BALANCE_MODAL_BOTON_HISTORIAL_CLASS}.
 */
export const BALANCE_MODAL_COL_HISTORIAL_CLASS =
  "border-l-2 border-[#0072BB] bg-muted/35";

export const BALANCE_MODAL_TH_HISTORIAL_CLASS =
  `${BALANCE_MODAL_COL_HISTORIAL_CLASS} w-11 min-w-11 max-w-11 p-0 text-center align-middle text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground`;

export const BALANCE_MODAL_TD_HISTORIAL_CLASS =
  `${BALANCE_MODAL_COL_HISTORIAL_CLASS} w-11 min-w-11 max-w-11 p-0 align-middle`;

/** Botón ícono ChartNoAxesColumn en columna Hist. de modales balance (7×7 rem, #0072BB). */
export const BALANCE_MODAL_BOTON_HISTORIAL_CLASS =
  `${TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS} !h-7 !w-7 min-h-7 min-w-7 shrink-0 !p-0 [&_svg]:size-3.5`;

/** Tooltip estándar: historial por rubro usa el gasto final de mayor monto en ese rubro. */
export const BALANCE_MODAL_HISTORIAL_RUBRO_TITLE =
  "Evolución mensual del gasto con mayor impacto en este rubro";

/**
 * Etiqueta de campo en modales (label nativo o `<Label>`).
 * Color `foreground` (negro de UI); `globals.css` refuerza en `.app-modal__body` / `.modal-app__body`.
 */
export const MODAL_FIELD_LABEL_CLASS = "modal-field-label text-foreground";

/**
 * Micro-etiqueta MAYÚSCULAS en modales (misma tipografía que `ModalMicroLabel`).
 * Preferir el componente `ModalMicroLabel`; usar esta constante solo en `<label>` compuestos.
 */
export const MODAL_MICRO_LABEL_CLASS =
  "modal-micro-label modal-field-label text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-foreground";
