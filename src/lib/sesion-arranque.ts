/**
 * Primera petición tras abrir el navegador (cookie de sesión ausente): el middleware
 * puede limpiar la cookie iron-session del rol para que el arranque sea siempre en modo simple.
 */
export const SESION_APP_BOOT_COOKIE = "tienda-app-arranque";

/** Cabecera interna que el middleware añade al request cuando limpia el rol en ese mismo ciclo. */
export const SESION_FORZAR_ROL_SIMPLE_HEADER = "x-tienda-forzar-rol-simple";

/** Nombre de la cookie iron-session (debe coincidir con `cookieName` en `sesion.ts`). */
export const SESION_ROL_IRON_COOKIE = "gestion-rol";
