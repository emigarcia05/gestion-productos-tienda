/**
 * Estándar de respuesta para la capa de servicios y Server Actions.
 * Single contract: todas las funciones que pueden fallar devuelven este objeto.
 */
export type ServiceResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
