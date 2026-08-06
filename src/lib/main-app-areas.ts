/**
 * Áreas principales de la aplicación (macro-secciones).
 * **Vendedor** (id `gestion-productos`): pedidos, ayuda vendedor, asistente IA.
 * **Administración** (id `finanzas`): balance, tesorería, análisis M.C., Análisis de Precios
 * (URLs de análisis aún bajo `/gestion-productos/analisis-precios/...`) y Estadísticas Productos
 * (URLs bajo `/estadisticas-productos/...`).
 * **Marketing** (id `marketing`).
 */

import {
  GP_ROUTES,
  isAnalisisPreciosPathname,
} from "@/lib/gestionProductosRoutes";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";

export type MainAppAreaId =
  | "gestion-productos"
  | "finanzas"
  | "marketing";

export interface MainAppAreaDefinition {
  id: MainAppAreaId;
  /** Título canónico en title case; en UI usar `areaLabelMayusculas(label)` en slidenav y modal de áreas. */
  label: string;
  /** Leyenda de estado bajo el logo (ej. Terminada / A construir). */
  statusLabel: string;
  /** Ruta de entrada al elegir el área desde el modal. */
  href: string;
}

export const MAIN_APP_AREAS: MainAppAreaDefinition[] = [
  {
    id: "gestion-productos",
    label: "Vendedor",
    statusLabel: "Terminada",
    href: GP_ROUTES.defaultEntry,
  },
  {
    id: "finanzas",
    label: "Administración",
    statusLabel: "A construir",
    href: "/finanzas/tesoreria",
  },
  {
    id: "marketing",
    label: "Marketing",
    statusLabel: "A construir",
    href: MARKETING_ROUTES.defaultEntry,
  },
];

export function getMainAppAreaIdFromPathname(pathname: string): MainAppAreaId {
  // Análisis de Precios: sidebar en Administración; URLs canónicas siguen en /gestion-productos/...
  if (isAnalisisPreciosPathname(pathname)) {
    return "finanzas";
  }
  if (pathname === "/finanzas" || pathname.startsWith("/finanzas/")) {
    return "finanzas";
  }
  // Estadísticas Productos vive en área Administración (URLs bajo /estadisticas-productos/...).
  if (
    pathname === "/estadisticas-productos" ||
    pathname.startsWith("/estadisticas-productos/")
  ) {
    return "finanzas";
  }
  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    return "marketing";
  }
  // Vendedor (id `gestion-productos`) — resto de rutas GP y legacy.
  return "gestion-productos";
}

export function getMainAppAreaById(id: MainAppAreaId): MainAppAreaDefinition {
  const found = MAIN_APP_AREAS.find((a) => a.id === id);
  if (!found) {
    throw new Error(`Unknown main app area: ${id}`);
  }
  return found;
}

/** Nombre del área en MAYÚSCULAS para slidenav y modal (locale `es`). */
export function areaLabelMayusculas(label: string): string {
  return label.toLocaleUpperCase("es");
}
