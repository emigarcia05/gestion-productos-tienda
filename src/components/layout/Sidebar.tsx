"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Handshake,
  ClipboardList,
  ChevronDown,
  AlarmClock,
  Send,
  FileSearch,
  List,
  Link2,
  RotateCw,
  Pipette,
  Droplets,
  GitCompare,
  Landmark,
  Wallet,
  CalendarDays,
  CalendarClock,
  Banknote,
  Scale,
  Receipt,
  FolderTree,
  BookOpen,
  CircleDollarSign,
  PieChart,
  Percent,
  ListChecks,
  LifeBuoy,
  LineChart,
  PackageSearch,
  Layers,
  PackageCheck,
  Megaphone,
  CalendarRange,
  Lightbulb,
  Target,
  Images,
  Palette,
  Sparkles,
  ScanSearch,
  BarChart3,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import SelectorRol from "@/components/SelectorRol";
import SyncStatusIndicator from "@/components/layout/SyncStatusIndicator";
import ImportStatusIndicator from "@/components/layout/ImportStatusIndicator";
import SidebarMainAppArea from "@/components/shared/SidebarMainAppArea";
import type { Rol } from "@/lib/permisos";
import { PERMISOS, puede } from "@/lib/permisos";
import { getMainAppAreaIdFromPathname } from "@/lib/main-app-areas";
import { GP_ROUTES, getGpSidebarModule, isGpRouteActive } from "@/lib/gestionProductosRoutes";
import { MARKETING_ROUTES } from "@/lib/marketingRoutes";
import { ESTADISTICAS_PRODUCTOS_ROUTES } from "@/lib/estadisticasProductosRoutes";

const iconClass = "h-5 w-5 shrink-0";

type ModuleId = "pedidos" | "ayuda-vendedor" | "asistente-ia";
type FinanzasModuleId = "balance" | "finanzas-main" | "analisis-mc" | "analisis-precios";
type MarketingModuleId = "publicaciones" | "base-multimedia";
type EstadisticasModuleId = "est-productos";
type SidebarModuleId = ModuleId | FinanzasModuleId | MarketingModuleId | EstadisticasModuleId;

interface SubmoduleItem {
  /** Omitir en agrupadores solo desplegables (sin página propia). */
  href?: string;
  label: string;
  icon: React.ReactNode;
  isUrgente?: boolean;
  /** Permiso para ver este enlace (por rol). Si no se define, solo editor. */
  permiso?: { simple: boolean; editor: boolean };
  children?: SubmoduleItem[];
}

type NavModule = {
  id: SidebarModuleId;
  label: string;
  icon: React.ReactNode;
  submodules: SubmoduleItem[];
  /** Enlace directo en sidebar (sin submódulos desplegables). */
  href?: string;
  permiso?: { simple: boolean; editor: boolean };
};

const MODULES: NavModule[] = [
  {
    id: "pedidos",
    label: "PEDIDO MERCADERIA",
    icon: <ClipboardList className={iconClass} />,
    submodules: [
      {
        href: GP_ROUTES.pedidoMercaderia.generarPedido,
        label: "Generar Pedido",
        icon: <Send className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.pedidos.acceso,
      },
      {
        label: "Conf. Pedido",
        icon: <ListChecks className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: GP_ROUTES.pedidoMercaderia.confPedido.urgente,
            label: "Urgente",
            icon: <AlarmClock className="h-4 w-4 shrink-0 text-accent2" />,
            isUrgente: true,
            permiso: PERMISOS.pedidos.acceso,
          },
          {
            href: GP_ROUTES.pedidoMercaderia.confPedido.tintometrico,
            label: "Tintométrico",
            icon: <Pipette className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.pedidos.acceso,
          },
          {
            href: GP_ROUTES.pedidoMercaderia.confPedido.reposicion,
            label: "Reposición",
            icon: <RotateCw className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.pedidos.acceso,
          },
        ],
      },
      {
        href: GP_ROUTES.pedidoMercaderia.recepcionPedido,
        label: "Recepcion Pedido",
        icon: <PackageCheck className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.pedidos.acceso,
      },
    ],
  },
  {
    id: "ayuda-vendedor",
    label: "AYUDA VENDEDOR",
    icon: <LifeBuoy className={iconClass} />,
    submodules: [
      {
        label: "Px Venta",
        icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido,
            label: "Px. Vta. Sugerido",
            icon: <FileSearch className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.proveedores.sugeridos,
          },
          {
            href: GP_ROUTES.ayudaVendedor.pxVenta.pxTintometrico,
            label: "Px Tintométrico",
            icon: <Pipette className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.tienda.tintoLts,
          },
        ],
      },
      {
        href: GP_ROUTES.ayudaVendedor.calcLitros,
        label: "Calc. Litros",
        icon: <Droplets className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.tienda.tintoLts,
      },
      {
        href: GP_ROUTES.ayudaVendedor.procesos,
        label: "Procesos",
        icon: <ListChecks className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.procesos.acceso,
      },
      {
        href: GP_ROUTES.ayudaVendedor.cargarGasto,
        label: "Cargar Gasto",
        icon: <Receipt className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.ayudaVendedor.cargarGasto,
      },
      {
        href: GP_ROUTES.ayudaVendedor.controlStock,
        label: "Control Stock",
        icon: <PackageSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.stock.acceso,
      },
    ],
  },
  {
    id: "asistente-ia",
    label: "ASISTENTE IA",
    icon: <Sparkles className={iconClass} />,
    submodules: [
      {
        href: GP_ROUTES.asistenteIa.buscarColorImagen,
        label: "Buscar Código Desde Imagen",
        icon: <ScanSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.asistenteIa.acceso,
      },
    ],
  },
];

const FINANZAS_MODULES: NavModule[] = [
  {
    id: "balance",
    label: "BALANCE",
    icon: <Scale className={iconClass} />,
    submodules: [
      {
        href: "/finanzas/balance/mensual",
        label: "Balance Mensual",
        icon: <BookOpen className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/balance/gastos",
        label: "Gastos",
        icon: <Receipt className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/balance/gastos/catalogo",
        label: "Catálogo Gastos",
        icon: <FolderTree className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/balance/vtas",
        label: "Ventas Mensuales",
        icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
    ],
  },
  {
    id: "finanzas-main",
    label: "FINANZAS",
    icon: <Landmark className={iconClass} />,
    submodules: [
      {
        href: "/finanzas/tesoreria",
        label: "Tesorería",
        icon: <Banknote className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/posicion-iva",
        label: "Posición de IVA",
        icon: <Percent className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/venc-por-fecha",
        label: "Flujo De Fondo",
        icon: <CalendarDays className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/deuda-proveedores",
        label: "Venc. Provee. Merc.",
        icon: <Wallet className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/vencimientos-gastos",
        label: "Venc. Provee. Gastos",
        icon: <CalendarClock className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/control-comprobantes",
        label: "Control Comprobantes",
        icon: <FileSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
    ],
  },
  {
    id: "analisis-mc",
    label: "ANALISIS M.C.",
    icon: <LineChart className={iconClass} />,
    submodules: [
      {
        href: "/finanzas/analisis-mc/margen-contribucion",
        label: "Margen Contribución",
        icon: <PieChart className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
      {
        href: "/finanzas/analisis-mc/costos-financieros",
        label: "Costos Financieros",
        icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.finanzas.acceso,
      },
    ],
  },
  {
    id: "analisis-precios",
    label: "ANALISIS DE PRECIOS",
    icon: <LineChart className={iconClass} />,
    submodules: [
      {
        label: "Lista Proveedores",
        icon: <Handshake className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: GP_ROUTES.analisisPrecios.listaProveedores.listaPrecios,
            label: "Lista Precios",
            icon: <FileSearch className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.proveedores.listaPrecios,
          },
          {
            href: GP_ROUTES.analisisPrecios.listaProveedores.lista,
            label: "Lista Proveedores",
            icon: <List className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.proveedores.lista,
          },
        ],
      },
      {
        label: "Cx y Px Tienda",
        icon: <Layers className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: GP_ROUTES.analisisPrecios.cxYPxTienda.cxCompra,
            label: "Cx Compra",
            icon: <Link2 className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.tienda.acceso,
          },
          {
            href: GP_ROUTES.analisisPrecios.cxYPxTienda.pxListas,
            label: "Px Listas",
            icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.cxPxTienda.acceso,
          },
        ],
      },
      {
        label: "Comparacion",
        icon: <GitCompare className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: GP_ROUTES.analisisPrecios.pxCompetencia,
            label: "Px Competencia",
            icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.cxPxTienda.acceso,
          },
          {
            href: GP_ROUTES.analisisPrecios.compCategorias.comparacion,
            label: "Categorias",
            icon: <FolderTree className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.comparacionCategorias.acceso,
          },
        ],
      },
    ],
  },
];

const MARKETING_MODULES: NavModule[] = [
  {
    id: "publicaciones",
    label: "PUBLICACIONES",
    icon: <Megaphone className={iconClass} />,
    submodules: [
      {
        href: MARKETING_ROUTES.publicaciones.calendario,
        label: "Calendario",
        icon: <CalendarRange className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.marketing.acceso,
      },
      {
        href: MARKETING_ROUTES.publicaciones.ideas,
        label: "Ideas Contenido",
        icon: <Lightbulb className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.marketing.acceso,
      },
      {
        href: MARKETING_ROUTES.publicaciones.objetivos,
        label: "Objetivos",
        icon: <Target className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.marketing.acceso,
      },
    ],
  },
  {
    id: "base-multimedia",
    label: "BASE MULTIMEDIA",
    icon: <Images className={iconClass} />,
    submodules: [
      {
        href: MARKETING_ROUTES.baseMultimedia.contenido,
        label: "Base Multimedia",
        icon: <Images className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.marketing.acceso,
      },
      {
        href: MARKETING_ROUTES.baseMultimedia.coloresMarca,
        label: "Colores Marca",
        icon: <Palette className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.marketing.acceso,
      },
    ],
  },
];

const ESTADISTICAS_MODULES: NavModule[] = [
  {
    id: "est-productos",
    label: "ESTADÍSTICAS",
    icon: <BarChart3 className={iconClass} />,
    submodules: [
      {
        href: ESTADISTICAS_PRODUCTOS_ROUTES.ventasPorProducto,
        label: "Carga de Datos",
        icon: <PackageSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.estadisticasProductos.acceso,
      },
      {
        href: ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion,
        label: "Categorizacion",
        icon: <Tags className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.estadisticasProductos.acceso,
      },
      {
        href: ESTADISTICAS_PRODUCTOS_ROUTES.estadisticasVtas,
        label: "Estadísticas Vtas",
        icon: <LineChart className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.estadisticasProductos.acceso,
      },
    ],
  },
];

function getOpenModule(pathname: string): SidebarModuleId {
  // Análisis de Precios vive en área Finanzas (URLs aún bajo /gestion-productos/...).
  const gpModule = getGpSidebarModule(pathname);
  if (gpModule === "analisis-precios") return "analisis-precios";
  if (pathname.startsWith("/finanzas/balance")) return "balance";
  if (pathname.startsWith("/finanzas/analisis-mc")) return "analisis-mc";
  if (pathname.startsWith("/finanzas")) return "finanzas-main";
  if (pathname.startsWith("/marketing/publicaciones") || pathname === "/marketing") {
    return "publicaciones";
  }
  if (pathname.startsWith("/marketing/base-multimedia")) {
    return "base-multimedia";
  }
  if (
    pathname === "/estadisticas-productos" ||
    pathname.startsWith("/estadisticas-productos/")
  ) {
    return "est-productos";
  }
  return gpModule;
}

function isSubmoduleActive(pathname: string, href: string): boolean {
  if (href.startsWith("/gestion-productos")) {
    return isGpRouteActive(pathname, href);
  }
  if (href === "/finanzas/tesoreria")
    return pathname === "/finanzas/tesoreria" || pathname === "/finanzas";
  if (href === "/finanzas/deuda-proveedores") return pathname === "/finanzas/deuda-proveedores";
  if (href === "/finanzas/vencimientos-gastos") return pathname === "/finanzas/vencimientos-gastos";
  if (href === "/finanzas/venc-por-fecha") return pathname === "/finanzas/venc-por-fecha";
  if (href === "/finanzas/control-comprobantes") return pathname === "/finanzas/control-comprobantes";
  if (href === "/finanzas/posicion-iva")
    return pathname === "/finanzas/posicion-iva" || pathname === "/finanzas/balance/posicion-iva";
  if (href === "/finanzas/balance/mensual")
    return pathname === "/finanzas/balance/mensual" || pathname === "/finanzas/balance";
  if (href === "/finanzas/balance/gastos") return pathname === "/finanzas/balance/gastos";
  if (href === "/finanzas/balance/gastos/catalogo") return pathname === "/finanzas/balance/gastos/catalogo";
  if (href === "/finanzas/analisis-mc/margen-contribucion")
    return pathname === "/finanzas/analisis-mc/margen-contribucion";
  if (href === "/finanzas/analisis-mc/costos-financieros")
    return pathname === "/finanzas/analisis-mc/costos-financieros";
  if (href === MARKETING_ROUTES.publicaciones.calendario) {
    return pathname === MARKETING_ROUTES.publicaciones.calendario;
  }
  if (href === MARKETING_ROUTES.publicaciones.ideas) {
    return pathname === MARKETING_ROUTES.publicaciones.ideas;
  }
  if (href === MARKETING_ROUTES.publicaciones.objetivos) {
    return pathname === MARKETING_ROUTES.publicaciones.objetivos;
  }
  if (href === MARKETING_ROUTES.baseMultimedia.contenido) {
    return pathname === MARKETING_ROUTES.baseMultimedia.contenido;
  }
  if (href === MARKETING_ROUTES.baseMultimedia.coloresMarca) {
    return pathname === MARKETING_ROUTES.baseMultimedia.coloresMarca;
  }
  if (href === ESTADISTICAS_PRODUCTOS_ROUTES.ventasPorProducto) {
    return (
      pathname === ESTADISTICAS_PRODUCTOS_ROUTES.ventasPorProducto ||
      pathname === "/estadisticas-productos"
    );
  }
  if (href === ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion) {
    return pathname === ESTADISTICAS_PRODUCTOS_ROUTES.categorizacion;
  }
  if (href === ESTADISTICAS_PRODUCTOS_ROUTES.estadisticasVtas) {
    return pathname === ESTADISTICAS_PRODUCTOS_ROUTES.estadisticasVtas;
  }
  return pathname === href;
}

function submoduleVisible(sub: SubmoduleItem, rol: Rol): boolean {
  if (sub.href) {
    const selfAllowed = !sub.permiso || puede(rol, sub.permiso);
    const childAllowed = sub.children?.some((c) => submoduleVisible(c, rol)) ?? false;
    return selfAllowed || childAllowed;
  }
  return sub.children?.some((c) => submoduleVisible(c, rol)) ?? false;
}

function isSubmoduleGroupActive(sub: SubmoduleItem, pathname: string): boolean {
  return (
    sub.children?.some((c) => (c.href ? isSubmoduleActive(pathname, c.href) : false)) ??
    false
  );
}

function submoduleGroupKey(moduleId: SidebarModuleId, label: string): string {
  return `${moduleId}:${label}`;
}

export default function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const pathModule = getOpenModule(pathname);
  const mainAreaId = getMainAppAreaIdFromPathname(pathname);
  const [openId, setOpenId] = useState<SidebarModuleId | null>(() => pathModule);
  const [openSubGroups, setOpenSubGroups] = useState<Set<string>>(() => new Set());

  const modulesForArea: NavModule[] =
    mainAreaId === "gestion-productos"
      ? MODULES
      : mainAreaId === "finanzas"
        ? FINANZAS_MODULES
        : mainAreaId === "marketing"
          ? MARKETING_MODULES
          : mainAreaId === "estadisticas-productos"
            ? ESTADISTICAS_MODULES
            : [];

  const visibleModules: NavModule[] = modulesForArea.filter((module) => {
    if (module.href && module.permiso && puede(rol, module.permiso)) return true;
    return module.submodules.some((sub) => submoduleVisible(sub, rol));
  });

  useEffect(() => {
    setOpenId(pathModule);
  }, [pathModule]);

  useEffect(() => {
    const areaModules =
      mainAreaId === "gestion-productos"
        ? MODULES
        : mainAreaId === "finanzas"
          ? FINANZAS_MODULES
          : mainAreaId === "marketing"
            ? MARKETING_MODULES
            : mainAreaId === "estadisticas-productos"
              ? ESTADISTICAS_MODULES
              : [];
    const autoOpenByModule = new Map<SidebarModuleId, string>();
    for (const navModule of areaModules) {
      for (const sub of navModule.submodules) {
        if (!sub.href && sub.children?.length && isSubmoduleGroupActive(sub, pathname)) {
          autoOpenByModule.set(navModule.id, submoduleGroupKey(navModule.id, sub.label));
        }
      }
    }
    if (autoOpenByModule.size === 0) return;
    setOpenSubGroups((prev) => {
      const next = new Set(prev);
      for (const [moduleId, key] of autoOpenByModule) {
        for (const k of [...next]) {
          if (k.startsWith(`${moduleId}:`)) next.delete(k);
        }
        next.add(key);
      }
      return next;
    });
  }, [pathname, mainAreaId]);

  function toggleSubGroup(moduleId: SidebarModuleId, key: string, open: boolean) {
    setOpenSubGroups((prev) => {
      if (!open) {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }
      const next = new Set(prev);
      for (const k of [...next]) {
        if (k.startsWith(`${moduleId}:`)) next.delete(k);
      }
      next.add(key);
      return next;
    });
  }

  function renderSubmoduleItems(
    submodules: SubmoduleItem[],
    moduleId: SidebarModuleId,
    depth = 0
  ) {
    return submodules
      .filter((sub) => submoduleVisible(sub, rol))
      .map((sub) => {
        if (!sub.href && sub.children?.length) {
          const groupKey = submoduleGroupKey(moduleId, sub.label);
          const isSubOpen = openSubGroups.has(groupKey);
          const groupActive = isSubmoduleGroupActive(sub, pathname);
          return (
            <Collapsible
              key={groupKey}
              open={isSubOpen}
              onOpenChange={(open) => toggleSubGroup(moduleId, groupKey, open)}
              className="group/subcollapsible"
            >
              <CollapsibleTrigger
                className={cn(
                  "flex w-full items-center gap-2 rounded-md py-2 pl-3 pr-2 text-sm font-medium text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  "border-l-2 -ml-[2px] pl-[10px]",
                  groupActive
                    ? "border-sidebar-indicator bg-sidebar-accent [&_svg]:text-sidebar-foreground"
                    : "border-transparent [&_svg]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-foreground"
                )}
                aria-expanded={isSubOpen}
              >
                {sub.icon}
                <span className="min-w-0 flex-1 truncate text-left">{sub.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-sidebar-indicator transition-transform duration-200",
                    isSubOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className={cn("space-y-0.5 py-0.5", depth === 0 ? "ml-4" : "ml-2")}>
                  {renderSubmoduleItems(sub.children, moduleId, depth + 1)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        }

        if (!sub.href) return null;

        const active = isSubmoduleActive(pathname, sub.href);
        return (
          <div key={sub.href} className="space-y-0.5">
            <Link
              href={sub.href}
              className={cn(
                "group flex items-center gap-2 rounded-md py-2 pl-3 pr-2 text-sm font-medium text-sidebar-foreground transition-colors",
                "border-l-2 -ml-[2px] pl-[10px]",
                active
                  ? "border-sidebar-indicator bg-sidebar-accent [&_svg]:text-sidebar-foreground"
                  : "border-transparent [&_svg]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-foreground",
                sub.isUrgente && "relative"
              )}
            >
              {sub.icon}
              <span className="min-w-0 truncate">{sub.label}</span>
            </Link>

            {sub.children && sub.children.length > 0 ? (
              <div className="ml-4 space-y-0.5">
                {renderSubmoduleItems(sub.children, moduleId, depth + 1)}
              </div>
            ) : null}
          </div>
        );
      });
  }

  return (
    <aside className="sidebar-container w-60 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      <nav className="flex flex-col gap-0.5 px-4 pt-3 pb-4 overflow-y-auto" aria-label="Navegación principal">
        {visibleModules.length > 0 ? (
          visibleModules.map((module) => {
            if (module.href) {
              const active = isSubmoduleActive(pathname, module.href);
              return (
                <Link
                  key={module.id}
                  href={module.href}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    "[&>span:first-child_svg]:text-sidebar-foreground",
                    active
                      ? "bg-sidebar-accent"
                      : "hover:bg-sidebar-accent"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {module.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-left">{module.label}</span>
                </Link>
              );
            }

            const isOpen = openId === module.id;
            return (
              <Collapsible
                key={module.id}
                open={isOpen}
                onOpenChange={(open) => setOpenId(open ? module.id : null)}
                className="group/collapsible"
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    "[&>span:first-child_svg]:text-sidebar-foreground",
                    !isOpen && "hover:bg-sidebar-accent"
                  )}
                  aria-expanded={isOpen}
                >
                  <span className="h-5 w-5 shrink-0 flex items-center justify-center">
                    {module.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-left">{module.label}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-sidebar-indicator transition-transform duration-200", isOpen && "rotate-180")}
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-0.5 ml-2 pl-4 border-l-2 border-sidebar-indicator space-y-0.5 py-1">
                    {renderSubmoduleItems(module.submodules, module.id)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        ) : (
          <div className="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 px-3 py-3 text-xs text-sidebar-foreground/80">
            No Hay Módulos Disponibles En Esta Área.
          </div>
        )}
      </nav>
      <div className="mt-auto flex flex-col px-4 pb-4">
        <div className="flex flex-col gap-2">
          <SyncStatusIndicator rol={rol} />
          <ImportStatusIndicator pollEnabled={rol === "editor"} />
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 pt-3">
          <div className="flex justify-center" aria-hidden>
            <div className="h-px w-[80%] shrink-0 bg-sidebar-foreground/85" />
          </div>
          <div className="rounded-lg px-2 pb-0">
            <SelectorRol rolActual={rol} compact />
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col pt-2 pb-2">
          <SidebarMainAppArea esEditor={rol === "editor"} className="pt-2" />
        </div>
      </div>
    </aside>
  );
}
