/**
 * Áreas principales de la aplicación (macro-secciones).
 * La mayoría de rutas actuales pertenecen a **Gestión Productos**; las demás tienen prefijo dedicado.
 */

export type MainAppAreaId = "gestion-productos" | "finanzas" | "estadisticas-productos";

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
    label: "Gestión Productos",
    statusLabel: "Terminada",
    href: "/gestion-productos/proveedores",
  },
  {
    id: "finanzas",
    label: "Finanzas",
    statusLabel: "A construir",
    href: "/finanzas/tesoreria",
  },
  {
    id: "estadisticas-productos",
    label: "Estadísticas Productos",
    statusLabel: "A construir",
    href: "/estadisticas-productos",
  },
];

export function getMainAppAreaIdFromPathname(pathname: string): MainAppAreaId {
  if (pathname === "/gestion-productos" || pathname.startsWith("/gestion-productos/")) {
    return "gestion-productos";
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
