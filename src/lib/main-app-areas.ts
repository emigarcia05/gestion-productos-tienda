/**
 * Áreas principales de la aplicación (macro-secciones).
 * **Gestión Del Vendedor** (antes Gestión Productos): pedidos, ayuda vendedor, asistente IA.
 * **Gestión Fin. & Adm.** (id `finanzas`; antes Finanzas): balance, tesorería, análisis M.C. y Análisis de Precios
 * (URLs de análisis aún bajo `/gestion-productos/analisis-precios/...`).
 */

import {
  GP_ROUTES,
  isAnalisisPreciosPathname,
} from "@/lib/gestionProductosRoutes";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";

export type MainAppAreaId =
  | "gestion-productos"
  | "finanzas"
  | "estadisticas-productos"
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
    label: "Gestión Del Vendedor",
    statusLabel: "Terminada",
    href: GP_ROUTES.defaultEntry,
  },
  {
    id: "finanzas",
    label: "Gestión Fin. & Adm.",
    statusLabel: "A construir",
    href: "/finanzas/tesoreria",
  },
  {
    id: "estadisticas-productos",
    label: "Estadísticas Productos",
    statusLabel: "A construir",
    href: "/estadisticas-productos",
  },
  {
    id: "marketing",
    label: "Marketing",
    statusLabel: "A construir",
    href: MARKETING_ROUTES.defaultEntry,
  },
];

export function getMainAppAreaIdFromPathname(pathname: string): MainAppAreaId {
  // Análisis de Precios: sidebar en Finanzas; URLs canónicas siguen en /gestion-productos/...
  if (isAnalisisPreciosPathname(pathname)) {
    return "finanzas";
  }
  if (pathname === "/finanzas" || pathname.startsWith("/finanzas/")) {
    return "finanzas";
  }
  if (
    pathname === "/estadisticas-productos" ||
    pathname.startsWith("/estadisticas-productos/")
  ) {
    return "estadisticas-productos";
  }
  if (pathname === "/marketing" || pathname.startsWith("/marketing/")) {
    return "marketing";
  }
  // Gestión Del Vendedor (id `gestion-productos`) — resto de rutas GP y legacy.
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
