"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  ChevronDown,
  AlarmClock,
  Send,
  FileSearch,
  RotateCw,
  Pipette,
  Droplets,
  Receipt,
  CircleDollarSign,
  ListChecks,
  PackageCheck,
  Megaphone,
  CalendarRange,
  Lightbulb,
  Target,
  Images,
  Palette,
  Sparkles,
  ScanSearch,
  Paintbrush,
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
import AdministracionAccordionNav from "@/components/layout/AdministracionAccordionNav";
import SidebarNavDivider from "@/components/layout/SidebarNavDivider";

const iconClass = "h-5 w-5 shrink-0";

type ModuleId =
  | "pedidos"
  | "asistencia-precios"
  | "calcular-lts"
  | "cargar-gastos"
  | "asistente-ia";
type MarketingModuleId = "publicaciones" | "base-multimedia";
type SidebarModuleId = ModuleId | MarketingModuleId;

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
    label: "MERCADERÍA",
    icon: <ClipboardList className={iconClass} />,
    submodules: [
      {
        label: "Cant. Pedida",
        icon: <ListChecks className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: GP_ROUTES.pedidoMercaderia.confPedido.urgente,
            label: "Urgente",
            icon: <AlarmClock className="h-4 w-4 shrink-0" />,
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
        href: GP_ROUTES.pedidoMercaderia.generarPedido,
        label: "Generar Pedido",
        icon: <Send className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.pedidos.acceso,
      },
      {
        href: GP_ROUTES.pedidoMercaderia.recepcionPedido,
        label: "Recepción Pedido",
        icon: <PackageCheck className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.pedidos.acceso,
      },
    ],
  },
  {
    id: "asistencia-precios",
    label: "PRECIOS",
    icon: <CircleDollarSign className={iconClass} />,
    submodules: [
      {
        href: GP_ROUTES.ayudaVendedor.pxVenta.pxVtaSugerido,
        label: "Px Sugeridos",
        icon: <FileSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.proveedores.sugeridos,
      },
      {
        href: GP_ROUTES.ayudaVendedor.pxVenta.pxTintometrico,
        label: "Px Tintométricos",
        icon: <Pipette className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.tienda.tintoLts,
      },
    ],
  },
  {
    id: "calcular-lts",
    label: "CALCULAR LTS",
    icon: <Droplets className={iconClass} />,
    href: GP_ROUTES.ayudaVendedor.calcLitros,
    permiso: PERMISOS.tienda.tintoLts,
    submodules: [],
  },
  {
    id: "cargar-gastos",
    label: "CARGAR GASTOS",
    icon: <Receipt className={iconClass} />,
    href: GP_ROUTES.ayudaVendedor.cargarGasto,
    permiso: PERMISOS.ayudaVendedor.cargarGasto,
    submodules: [],
  },
  {
    id: "asistente-ia",
    label: "ASISTENTE IA",
    icon: <Sparkles className={iconClass} />,
    submodules: [
      {
        href: GP_ROUTES.asistenteIa.buscarColorImagen,
        label: "Buscar Cód. Imagen",
        icon: <ScanSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.asistenteIa.acceso,
      },
      {
        href: GP_ROUTES.asistenteIa.disenarColores,
        label: "Diseñar",
        icon: <Paintbrush className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.asistenteIa.acceso,
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

function getOpenModule(pathname: string): SidebarModuleId | null {
  if (pathname.startsWith("/marketing/publicaciones") || pathname === "/marketing") {
    return "publicaciones";
  }
  if (pathname.startsWith("/marketing/base-multimedia")) {
    return "base-multimedia";
  }
  const gpModule = getGpSidebarModule(pathname);
  if (gpModule === "analisis-precios" || gpModule === "control-stock") {
    return null;
  }
  return gpModule;
}

function isSubmoduleActive(pathname: string, href: string): boolean {
  if (href.startsWith("/gestion-productos") || href.startsWith("/asistente-ia")) {
    return isGpRouteActive(pathname, href);
  }
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

/** True si el módulo o algún descendiente coincide con la ruta (ancestro / enlace directo). */
function isNavModuleActive(module: NavModule, pathname: string): boolean {
  if (module.href && isSubmoduleActive(pathname, module.href)) return true;
  function walk(items: SubmoduleItem[]): boolean {
    for (const item of items) {
      if (item.href && isSubmoduleActive(pathname, item.href)) return true;
      if (item.children?.length && walk(item.children)) return true;
    }
    return false;
  }
  return walk(module.submodules);
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
      : mainAreaId === "marketing"
        ? MARKETING_MODULES
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
        : mainAreaId === "marketing"
          ? MARKETING_MODULES
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
    moduleId: SidebarModuleId
  ) {
    const visible = submodules.filter((sub) => submoduleVisible(sub, rol));
    return visible.map((sub) => {
      if (!sub.href && sub.children?.length) {
        const groupKey = submoduleGroupKey(moduleId, sub.label);
        const isSubOpen = openSubGroups.has(groupKey);
        const groupActive = isSubmoduleGroupActive(sub, pathname);
        return (
          <div key={groupKey}>
            <Collapsible
              open={isSubOpen}
              onOpenChange={(open) => toggleSubGroup(moduleId, groupKey, open)}
              className="group/subcollapsible"
            >
              <CollapsibleTrigger
                className="sidebar-nav-item"
                data-ancestor={groupActive ? "true" : undefined}
                aria-expanded={isSubOpen}
              >
                {sub.icon}
                <span className="min-w-0 flex-1 truncate text-left">{sub.label}</span>
                <ChevronDown
                  className={cn(
                    "sidebar-nav-chevron h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    isSubOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="sidebar-nav-tree sidebar-nav-tree--nested">
                  {renderSubmoduleItems(sub.children, moduleId)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      }

      if (!sub.href) return null;

      const active = isSubmoduleActive(pathname, sub.href);
      return (
        <div key={sub.href}>
          <div className="space-y-0">
            <Link
              href={sub.href}
              className={cn("sidebar-nav-item", sub.isUrgente && "relative")}
              data-active={active ? "true" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {sub.icon}
              <span className="min-w-0 truncate">{sub.label}</span>
            </Link>

            {sub.children && sub.children.length > 0 ? (
              <div className="sidebar-nav-tree sidebar-nav-tree--nested">
                {renderSubmoduleItems(sub.children, moduleId)}
              </div>
            ) : null}
          </div>
        </div>
      );
    });
  }

  return (
    <aside className="sidebar-container w-60 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      <nav className="flex flex-col gap-0.5 px-4 pt-3 pb-4 overflow-y-auto" aria-label="Navegación principal">
        {mainAreaId === "finanzas" ? (
          <AdministracionAccordionNav rol={rol} />
        ) : visibleModules.length > 0 ? (
          visibleModules.map((module, moduleIndex) => {
            const moduleDivider = moduleIndex > 0 ? <SidebarNavDivider /> : null;

            if (module.href) {
              const active = isSubmoduleActive(pathname, module.href);
              return (
                <div key={module.id}>
                  {moduleDivider}
                  <Link
                    href={module.href}
                    className="sidebar-nav-module"
                    data-active={active ? "true" : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {module.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-left">{module.label}</span>
                  </Link>
                </div>
              );
            }

            const isOpen = openId === module.id;
            const moduleAncestor = isNavModuleActive(module, pathname);
            return (
              <div key={module.id}>
                {moduleDivider}
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setOpenId(open ? module.id : null)}
                  className="group/collapsible"
                >
                  <CollapsibleTrigger
                    className="sidebar-nav-module"
                    data-ancestor={moduleAncestor ? "true" : undefined}
                    aria-expanded={isOpen}
                  >
                    <span className="h-5 w-5 shrink-0 flex items-center justify-center">
                      {module.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-left">{module.label}</span>
                    <ChevronDown
                      className={cn(
                        "sidebar-nav-chevron h-4 w-4 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="sidebar-nav-tree">
                      {renderSubmoduleItems(module.submodules, module.id)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
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
