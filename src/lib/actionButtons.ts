/**
 * Estilo maestro para botones de acción en tarjetas de título (Header).
 * MAIN_BUTTON_* se aplican como clases Tailwind para que ganen sobre las variantes
 * del componente Button (evita que h-9 del size="default" pise el estilo).
 */

/** Dimensiones y efectos del "Main Button": 2.5rem, 1rem padding, rounded-lg, font-semibold, sombra */
export const MAIN_BUTTON_CLASSES =
  "h-10 min-h-10 px-4 rounded-lg font-semibold shadow-sm transition-[box-shadow,background-color,filter] duration-150 hover:shadow-md";

/** Secundarios (Importar Lista, Acción Masiva, etc.): borde, texto oscuro */
export const ACTION_BUTTON_SECONDARY =
  `${MAIN_BUTTON_CLASSES} border border-slate-300 text-slate-900 hover:bg-slate-50`;

/** Principal (Crear Proveedor, Generar Pedido): fondo primario, texto blanco */
export const ACTION_BUTTON_PRIMARY =
  `${MAIN_BUTTON_CLASSES} bg-primary text-primary-foreground hover:brightness-90`;
