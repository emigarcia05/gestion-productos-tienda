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
  History,
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
  Percent,
  ListChecks,
  LifeBuoy,
  LineChart,
  PackageSearch,
  Layers,
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

const iconClass = "h-5 w-5 shrink-0";

type ModuleId = "pedidos" | "ayuda-vendedor" | "proveedores" | "analisis-precios";
type FinanzasModuleId = "balance" | "finanzas-main";
type SidebarModuleId = ModuleId | FinanzasModuleId;

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
    label: "PEDIDO DE MERCADERÍA",
    icon: <ClipboardList className={iconClass} />,
    submodules: [
      {
        href: "/gestion-productos/pedidos/generar-pedido",
        label: "Generar Pedido",
        icon: <Send className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.pedidos.acceso,
        children: [
          {
            href: "/gestion-productos/pedidos/urgente",
            label: "Urgente",
            icon: <AlarmClock className="h-4 w-4 shrink-0 text-accent2" />,
            isUrgente: true,
            permiso: PERMISOS.pedidos.acceso,
          },
          {
            href: "/gestion-productos/pedidos/tintometrico",
            label: "Tintométrico",
            icon: <Pipette className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.pedidos.acceso,
          },
          {
            href: "/gestion-productos/pedidos/reposicion",
            label: "Reposición",
            icon: <RotateCw className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.pedidos.acceso,
          },
        ],
      },
      {
        href: "/gestion-productos/pedidos/historial",
        label: "Historial Pedidos",
        icon: <History className="h-4 w-4 shrink-0" />,
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
        href: "/gestion-productos/proveedores/sugeridos",
        label: "Px. Vta. Sugeridos",
        icon: <FileSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.proveedores.sugeridos,
      },
      {
        href: "/gestion-productos/tienda/calc-tintometrico",
        label: "Calc. Tintométrico",
        icon: <Pipette className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.tienda.tintoLts,
      },
      {
        href: "/gestion-productos/tienda/calc-litros",
        label: "Calc. Litros",
        icon: <Droplets className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.tienda.tintoLts,
      },
      {
        href: "/gestion-productos/procesos",
        label: "Procesos",
        icon: <ListChecks className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.procesos.acceso,
      },
      {
        href: "/gestion-productos/tienda/control-stock",
        label: "Control Stock",
        icon: <PackageSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.stock.acceso,
      },
    ],
  },
  {
    id: "proveedores",
    label: "LISTA PROVEEDORES",
    icon: <Handshake className={iconClass} />,
    submodules: [
      {
        href: "/gestion-productos/proveedores/lista-precios",
        label: "Lista Precios",
        icon: <FileSearch className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.proveedores.listaPrecios,
      },
      {
        href: "/gestion-productos/proveedores/lista",
        label: "Lista Proveedores",
        icon: <List className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.proveedores.lista,
      },
    ],
  },
  {
    id: "analisis-precios",
    label: "ANALISIS DE PRECIOS",
    icon: <LineChart className={iconClass} />,
    submodules: [
      {
        label: "Cx y Px Tienda",
        icon: <Layers className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: "/gestion-productos/tienda/comp-proveedores",
            label: "Cx Compra",
            icon: <Link2 className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.tienda.acceso,
          },
          {
            href: "/gestion-productos/tienda/px-listas",
            label: "Px Listas",
            icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.cxPxTienda.acceso,
          },
        ],
      },
      {
        href: "/gestion-productos/tienda/cx-px-tienda",
        label: "Px Competencia",
        icon: <CircleDollarSign className="h-4 w-4 shrink-0" />,
        permiso: PERMISOS.cxPxTienda.acceso,
      },
      {
        label: "Comp. Categorias",
        icon: <FolderTree className="h-4 w-4 shrink-0" />,
        children: [
          {
            href: "/gestion-productos/proveedores/comparacion-categorias",
            label: "Comparacion",
            icon: <GitCompare className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.comparacionCategorias.acceso,
          },
          {
            href: "/gestion-productos/proveedores/comparacion-categorias/categorias",
            label: "Categorias",
            icon: <FolderTree className="h-4 w-4 shrink-0" />,
            permiso: PERMISOS.comparacionCategorias.editar,
          },
        ],
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
];

function getOpenModule(pathname: string): SidebarModuleId {
  if (pathname.startsWith("/finanzas/balance")) return "balance";
  if (pathname.startsWith("/finanzas")) return "finanzas-main";
  if (pathname.startsWith("/gestion-productos/pedidos") || pathname.startsWith("/pedidos")) return "pedidos";
  if (
    pathname.startsWith("/gestion-productos/tienda/calc-tintometrico") ||
    pathname.startsWith("/gestion-productos/tienda/calc-litros") ||
    pathname.startsWith("/gestion-productos/tienda/control-stock") ||
    pathname.startsWith("/tienda/tintometrico") ||
    pathname.startsWith("/tienda/litros") ||
    pathname.startsWith("/tienda/tinto-lts") ||
    pathname.startsWith("/stock") ||
    pathname === "/gestion-productos/proveedores/sugeridos" ||
    pathname === "/proveedores/sugeridos" ||
    pathname.startsWith("/gestion-productos/procesos") ||
    pathname.startsWith("/procesos")
  ) {
    return "ayuda-vendedor";
  }
  if (
    pathname.startsWith("/gestion-productos/tienda/comp-proveedores") ||
    pathname.startsWith("/gestion-productos/tienda/cx-px-tienda") ||
    pathname.startsWith("/gestion-productos/tienda/px-listas") ||
    pathname === "/gestion-productos/tienda" ||
    pathname.startsWith("/tienda/comp-proveedores") ||
    pathname.startsWith("/tienda/cx-px") ||
    pathname.startsWith("/tienda/px-listas") ||
    pathname === "/tienda" ||
    pathname.startsWith("/gestion-productos/precios-competencia") ||
    pathname.startsWith("/precios-competencia") ||
    pathname.startsWith("/gestion-productos/proveedores/competencia-precios") ||
    pathname.startsWith("/proveedores/competencia-precios") ||
    pathname.startsWith("/gestion-productos/proveedores/comparacion-categorias") ||
    pathname.startsWith("/proveedores/comparacion-categorias")
  ) {
    return "analisis-precios";
  }
  if (
    pathname.startsWith("/gestion-productos/proveedores/lista-precios") ||
    pathname.startsWith("/proveedores/lista-precios") ||
    pathname.startsWith("/gestion-productos/proveedores/lista") ||
    pathname.startsWith("/proveedores/lista") ||
    pathname === "/gestion-productos/proveedores" ||
    pathname === "/proveedores"
  ) {
    return "proveedores";
  }
  return "pedidos";
}

function isSubmoduleActive(pathname: string, href: string): boolean {
  if (href === "/gestion-productos/proveedores/sugeridos") return pathname === "/gestion-productos/proveedores/sugeridos" || pathname === "/proveedores/sugeridos";
  if (href === "/gestion-productos/proveedores/lista-precios") return pathname === "/gestion-productos/proveedores/lista-precios" || pathname === "/proveedores/lista-precios";
  if (href === "/gestion-productos/proveedores/comparacion-categorias/categorias")
    return (
      pathname === "/gestion-productos/proveedores/comparacion-categorias/categorias" ||
      pathname === "/proveedores/comparacion-categorias/categorias"
    );
  if (href === "/gestion-productos/proveedores/comparacion-categorias")
    return (
      (pathname === "/gestion-productos/proveedores/comparacion-categorias" ||
        pathname === "/proveedores/comparacion-categorias") &&
      !pathname.endsWith("/categorias")
    );
  if (href === "/gestion-productos/proveedores") return pathname === "/gestion-productos/proveedores" || pathname === "/proveedores" || pathname === "/";
  if (href === "/gestion-productos/proveedores/lista") return pathname === "/gestion-productos/proveedores/lista" || pathname === "/proveedores/lista";
  if (href === "/gestion-productos/tienda/px-listas")
    return (
      pathname === "/gestion-productos/tienda/px-listas" ||
      pathname.startsWith("/tienda/px-listas")
    );
  if (href === "/gestion-productos/tienda/cx-px-tienda")
    return (
      pathname === "/gestion-productos/tienda/cx-px-tienda" ||
      pathname.startsWith("/tienda/cx-px") ||
      pathname === "/gestion-productos/precios-competencia" ||
      pathname === "/precios-competencia" ||
      pathname === "/gestion-productos/proveedores/competencia-precios" ||
      pathname === "/proveedores/competencia-precios"
    );
  if (href === "/gestion-productos/tienda/comp-proveedores")
    return pathname === "/gestion-productos/tienda/comp-proveedores" || pathname === "/tienda";
  if (href === "/gestion-productos/tienda/control-stock") return pathname === "/gestion-productos/tienda/control-stock" || pathname === "/stock";
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
  if (href === "/gestion-productos/procesos") return pathname === "/gestion-productos/procesos" || pathname === "/procesos";
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
          : [];
    const autoOpen = new Set<string>();
    for (const navModule of areaModules) {
      for (const sub of navModule.submodules) {
        if (!sub.href && sub.children?.length && isSubmoduleGroupActive(sub, pathname)) {
          autoOpen.add(submoduleGroupKey(navModule.id, sub.label));
        }
      }
    }
    if (autoOpen.size === 0) return;
    setOpenSubGroups((prev) => new Set([...prev, ...autoOpen]));
  }, [pathname, mainAreaId]);

  function toggleSubGroup(key: string, open: boolean) {
    setOpenSubGroups((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
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
              onOpenChange={(open) => toggleSubGroup(groupKey, open)}
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
