/**
 * Estilos estándar para botones de acción del Header (Tarjeta de Título).
 * Todos los botones de acción deben compartir: h-10 px-4 (forzado por SectionHeader), rounded-lg, font-semibold.
 */

/** Secundarios (Importar, Sincronizar, Exportar, Imprimir, Acción Masiva): borde sutil, hover con sombra */
export const ACTION_BUTTON_SECONDARY =
  "rounded-lg border border-slate-300 font-semibold text-slate-900 hover:shadow-md transition-shadow duration-150";

/** Principal (Crear Proveedor, Generar Pedido): fondo #0072BB, texto blanco, hover con sombra */
export const ACTION_BUTTON_PRIMARY =
  "rounded-lg font-semibold bg-primary text-primary-foreground shadow-sm hover:brightness-90 hover:shadow-md transition-all duration-150";
