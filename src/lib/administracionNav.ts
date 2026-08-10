/**
 * Navegación del área **Administración**: 5 pilares en sidebar + árbol
 * de decisiones en acordeón vertical (`AdministracionAccordionNav`).
 *
 * FINANZAS → BALANCE | OPERACIONES → pantallas
 * LISTA PRECIOS → PX TIENDA | PROVEEDORES | ANÁLISIS M.C. → pantallas
 * PEDIDO A FÁBRICA → pantallas
 * ESTADÍSTICAS → pantallas
 * CONFIGURACION → pantallas
 */

import {
  GP_ROUTES,
  isAnalisisPreciosPathname,
  isGpRouteActive,
} from "@/lib/gestionProductosRoutes";
import { ESTADISTICAS_PRODUCTOS_ROUTES } from "@/lib/estadisticasProductosRoutes";
import {
  PEDIDO_A_FABRICA_LEGACY_PATH,
  PEDIDO_A_FABRICA_ROUTES,
} from "@/lib/pedidoAFabricaRoutes";
import { PERMISOS } from "@/lib/permisos";

export type AdmPillarId =
  | "finanzas"
  | "listas-precios"
  | "pedido-a-fabrica"
  | "estadisticas"
  | "configuracion";

export type AdmIconId =
  | "landmark"
  | "handshake"
  | "bar-chart-3"
  | "factory"
  | "settings"
  | "scale"
  | "receipt"
  | "folder-tree"
  | "circle-dollar"
  | "banknote"
  | "percent"
  | "calendar-days"
  | "wallet"
  | "calendar-clock"
  | "file-search"
  | "line-chart"
  | "pie-chart"
  | "list"
  | "link-2"
  | "package-search"
  | "tags";

export interface AdmScreenDef {
  id: string;
  label: string;
  href: string;
  icon: AdmIconId;
  permiso: { simple: boolean; editor: boolean };
}

/** Grupo intermedio del acordeón (abre pantallas hijas). */
export interface AdmGroupDef {
  id: string;
  label: string;
  icon: AdmIconId;
  screens: AdmScreenDef[];
}

export interface AdmPillarDef {
  id: AdmPillarId;
  /** Label sidebar (MAYÚSCULAS). */
  label: string;
  icon: AdmIconId;
  /**
   * Primer desglose: grupos (acordeón anidado) o pantallas directas.
   */
  groups?: AdmGroupDef[];
  screens?: AdmScreenDef[];
}

const balanceScreens: AdmScreenDef[] = [
  {
    id: "balance-mensual",
    label: "Balance Mensual",
    href: "/finanzas/balance/mensual",
    icon: "scale",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "gastos",
    label: "Gastos",
    href: "/finanzas/balance/gastos",
    icon: "receipt",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "catalogo-gastos",
    label: "Catálogo Gastos",
    href: "/finanzas/balance/gastos/catalogo",
    icon: "folder-tree",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "ventas-mensuales",
    label: "Ventas Mensuales",
    href: "/finanzas/balance/vtas",
    icon: "circle-dollar",
    permiso: PERMISOS.finanzas.acceso,
  },
];

const operacionesScreens: AdmScreenDef[] = [
  {
    id: "tesoreria",
    label: "Tesorería",
    href: "/finanzas/tesoreria",
    icon: "banknote",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "posicion-iva",
    label: "Posición De IVA",
    href: "/finanzas/posicion-iva",
    icon: "percent",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "flujo-de-fondo",
    label: "Flujo De Fondo",
    href: "/finanzas/venc-por-fecha",
    icon: "calendar-days",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "venc-provee-merc",
    label: "Venc. Provee. Merc.",
    href: "/finanzas/deuda-proveedores",
    icon: "wallet",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "venc-provee-gastos",
    label: "Venc. Provee. Gastos",
    href: "/finanzas/vencimientos-gastos",
    icon: "calendar-clock",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "control-comprobantes",
    label: "Control Comprobantes",
    href: "/finanzas/control-comprobantes",
    icon: "file-search",
    permiso: PERMISOS.finanzas.acceso,
  },
];

const pxTiendaScreens: AdmScreenDef[] = [
  {
    id: "cx-compra",
    label: "Cx. Compra",
    href: GP_ROUTES.analisisPrecios.cxYPxTienda.cxCompra,
    icon: "link-2",
    permiso: PERMISOS.tienda.acceso,
  },
  {
    id: "px-listas",
    label: "Px. Listas",
    href: GP_ROUTES.analisisPrecios.cxYPxTienda.pxListas,
    icon: "circle-dollar",
    permiso: PERMISOS.cxPxTienda.acceso,
  },
  {
    id: "px-competencia",
    label: "Px. Competencia",
    href: GP_ROUTES.analisisPrecios.pxCompetencia,
    icon: "circle-dollar",
    permiso: PERMISOS.cxPxTienda.acceso,
  },
  {
    id: "categorias",
    label: "Analisis Por Cat.",
    href: GP_ROUTES.analisisPrecios.compCategorias.comparacion,
    icon: "folder-tree",
    permiso: PERMISOS.comparacionCategorias.acceso,
  },
];

const proveedoresScreens: AdmScreenDef[] = [
  {
    id: "lista-precios",
    label: "Listas Px Prov.",
    href: GP_ROUTES.analisisPrecios.listaProveedores.listaPrecios,
    icon: "file-search",
    permiso: PERMISOS.proveedores.listaPrecios,
  },
  {
    id: "lista-proveedores",
    label: "Lista Prov.",
    href: GP_ROUTES.analisisPrecios.listaProveedores.lista,
    icon: "list",
    permiso: PERMISOS.proveedores.lista,
  },
];

const analisisMcScreens: AdmScreenDef[] = [
  {
    id: "margen-contribucion",
    label: "Margen Contribución",
    href: "/finanzas/analisis-mc/margen-contribucion",
    icon: "pie-chart",
    permiso: PERMISOS.finanzas.acceso,
  },
  {
    id: "costos-financieros",
    label: "Cx. Financieros",
    href: "/finanzas/analisis-mc/costos-financieros",
    icon: "circle-dollar",
    permiso: PERMISOS.finanzas.acceso,
  },
];

const pedidoAFabricaScreens: AdmScreenDef[] = [
  {
    id: "pedido-a-fabrica",
    label: "Pedido A Fábrica",
    href: PEDIDO_A_FABRICA_ROUTES.defaultEntry,
    icon: "factory",
    permiso: PERMISOS.estadisticasProductos.acceso,
  },
];

const estadisticasScreens: AdmScreenDef[] = [
  {
    id: "estadisticas-vtas",
    label: "Vtas Por. Prod.",
    href: ESTADISTICAS_PRODUCTOS_ROUTES.estadisticasVtas,
    icon: "line-chart",
    permiso: PERMISOS.estadisticasProductos.acceso,
  },
];

const configuracionScreens: AdmScreenDef[] = [
  {
    id: "carga-de-datos",
    label: "Carga Datos",
    href: ESTADISTICAS_PRODUCTOS_ROUTES.ventasPorProducto,
    icon: "package-search",
    permiso: PERMISOS.estadisticasProductos.acceso,
  },
  {
    id: "categorizacion",
    label: "Categorizacion",
    href: ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion,
    icon: "tags",
    permiso: PERMISOS.estadisticasProductos.acceso,
  },
];

export const ADM_PILLARS: AdmPillarDef[] = [
  {
    id: "finanzas",
    label: "FINANZAS",
    icon: "landmark",
    groups: [
      {
        id: "balance",
        label: "BALANCE",
        icon: "scale",
        screens: balanceScreens,
      },
      {
        id: "operaciones",
        label: "OPERACIONES",
        icon: "banknote",
        screens: operacionesScreens,
      },
    ],
  },
  {
    id: "listas-precios",
    label: "LISTA PRECIOS",
    icon: "handshake",
    groups: [
      {
        id: "px-tienda",
        label: "PX TIENDA",
        icon: "circle-dollar",
        screens: pxTiendaScreens,
      },
      {
        id: "proveedores",
        label: "PROVEEDORES",
        icon: "list",
        screens: proveedoresScreens,
      },
      {
        id: "analisis-mc",
        label: "ANÁLISIS M.C.",
        icon: "line-chart",
        screens: analisisMcScreens,
      },
    ],
  },
  {
    id: "pedido-a-fabrica",
    label: "PEDIDO A FÁBRICA",
    icon: "factory",
    screens: pedidoAFabricaScreens,
  },
  {
    id: "estadisticas",
    label: "ESTADÍSTICAS",
    icon: "bar-chart-3",
    screens: estadisticasScreens,
  },
  {
    id: "configuracion",
    label: "CONFIGURACION",
    icon: "settings",
    screens: configuracionScreens,
  },
];

function pathnameMatchesScreen(pathname: string, href: string): boolean {
  if (
    href.startsWith("/gestion-productos") ||
    href.startsWith("/proveedores") ||
    href.startsWith("/tienda")
  ) {
    return isGpRouteActive(pathname, href);
  }
  if (href === PEDIDO_A_FABRICA_ROUTES.defaultEntry) {
    return (
      pathname === PEDIDO_A_FABRICA_ROUTES.defaultEntry ||
      pathname.startsWith(`${PEDIDO_A_FABRICA_ROUTES.defaultEntry}/`) ||
      pathname === PEDIDO_A_FABRICA_LEGACY_PATH ||
      pathname.startsWith(`${PEDIDO_A_FABRICA_LEGACY_PATH}/`)
    );
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function collectPillarScreens(pillar: AdmPillarDef): AdmScreenDef[] {
  if (pillar.screens?.length) return pillar.screens;
  return pillar.groups?.flatMap((g) => g.screens) ?? [];
}

export function isAdmScreenActive(pathname: string, screen: AdmScreenDef): boolean {
  // Prefijo más largo gana entre todos los screens del área (catálogo vs gastos).
  let best: AdmScreenDef | null = null;
  for (const pillar of ADM_PILLARS) {
    for (const s of collectPillarScreens(pillar)) {
      if (!pathnameMatchesScreen(pathname, s.href)) continue;
      if (!best || s.href.length > best.href.length) best = s;
    }
  }
  return best?.id === screen.id;
}

export function isAdmGroupActive(pathname: string, group: AdmGroupDef): boolean {
  return group.screens.some((s) => isAdmScreenActive(pathname, s));
}

export function isAdmPillarActive(pathname: string, pillar: AdmPillarDef): boolean {
  if (pillar.id === "listas-precios") {
    if (isAnalisisPreciosPathname(pathname)) return true;
    if (pathname.startsWith("/finanzas/analisis-mc")) return true;
    return collectPillarScreens(pillar).some((s) => isAdmScreenActive(pathname, s));
  }
  if (pillar.id === "pedido-a-fabrica") {
    return (
      pathname === PEDIDO_A_FABRICA_ROUTES.defaultEntry ||
      pathname.startsWith(`${PEDIDO_A_FABRICA_ROUTES.defaultEntry}/`) ||
      pathname === PEDIDO_A_FABRICA_LEGACY_PATH ||
      pathname.startsWith(`${PEDIDO_A_FABRICA_LEGACY_PATH}/`)
    );
  }
  if (pillar.id === "configuracion") {
    return collectPillarScreens(pillar).some((s) => isAdmScreenActive(pathname, s));
  }
  if (pillar.id === "estadisticas") {
    return collectPillarScreens(pillar).some((s) => isAdmScreenActive(pathname, s));
  }
  // FINANZAS: /finanzas/* excepto analisis-mc (está en LISTA PRECIOS)
  if (pathname.startsWith("/finanzas/analisis-mc")) return false;
  return (
    pathname === "/finanzas" ||
    pathname.startsWith("/finanzas/") ||
    collectPillarScreens(pillar).some((s) => isAdmScreenActive(pathname, s))
  );
}

export function pillarHasVisibleItems(
  pillar: AdmPillarDef,
  puedeFn: (permiso: { simple: boolean; editor: boolean }) => boolean
): boolean {
  return collectPillarScreens(pillar).some((s) => puedeFn(s.permiso));
}

export function filterVisibleScreens(
  screens: AdmScreenDef[],
  puedeFn: (permiso: { simple: boolean; editor: boolean }) => boolean
): AdmScreenDef[] {
  return screens.filter((s) => puedeFn(s.permiso));
}

export function filterVisibleGroups(
  groups: AdmGroupDef[],
  puedeFn: (permiso: { simple: boolean; editor: boolean }) => boolean
): AdmGroupDef[] {
  return groups
    .map((g) => ({
      ...g,
      screens: filterVisibleScreens(g.screens, puedeFn),
    }))
    .filter((g) => g.screens.length > 0);
}
