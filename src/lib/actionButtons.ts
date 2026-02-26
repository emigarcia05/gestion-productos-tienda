/**
 * Estilo maestro para botones de acción en tarjetas de título (Header).
 * Una sola clase base garantiza padding, border-radius, sombras y hover consistentes.
 * SectionHeader aplica [&_button]:!h-10 [&_button]:!px-4 a los hijos.
 */

/** Base compartida: bordes redondeados, sombra sutil, transición y hover con más sombra */
export const ACTION_BUTTON_BASE =
  "rounded-lg font-semibold shadow-sm transition-all duration-150 hover:shadow-md";

/** Secundarios (Importar, Sincronizar, Exportar, Imprimir, Acción Masiva, Limpiar Filtros): borde, texto oscuro */
export const ACTION_BUTTON_SECONDARY =
  `${ACTION_BUTTON_BASE} border border-slate-300 text-slate-900 hover:bg-slate-50`;

/** Principal (Crear Proveedor, Generar Pedido): fondo #0072BB, texto blanco */
export const ACTION_BUTTON_PRIMARY =
  `${ACTION_BUTTON_BASE} bg-primary text-primary-foreground hover:brightness-90`;
