"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Handshake,
  ShoppingBag,
  PackageSearch,
  ClipboardList,
  ChevronDown,
  AlarmClock,
  Send,
  FileSearch,
  List,
  Link2,
  TrendingUp,
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

type ModuleId = "proveedores" | "tienda" | "pedidos";
type FinanzasModuleId = "balance" | "finanzas-main";
type SidebarModuleId = ModuleId | FinanzasModuleId;

interface SubmoduleItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isUrgente?: boolean;
  /** Permiso para ver este enlace (por rol). Si no se define, solo editor. */
  permiso?: { simple: boolean; editor: boolean };
  children?: SubmoduleItem[];
}

const MODULES: {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  submodules: SubmoduleItem[];
}[] = [
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
    id: "proveedores",
    label: "LISTA PROVEEDORES",
    icon: <Handshake className={iconClass} />,
    submodules: [
      { href: "/gestion-productos/proveedores/lista-precios", label: "Lista Px Proveedores", icon: <FileSearch className="h-4 w-4 shrink-0" />, permiso: PERMISOS.proveedores.listaPrecios },
      { href: "/gestion-productos/proveedores/sugeridos", label: "Px. Vta. Sugeridos", icon: <FileSearch className="h-4 w-4 shrink-0" />, permiso: PERMISOS.proveedores.sugeridos },
      { href: "/gestion-productos/proveedores/comparacion-categorias", label: "Comp. Por Cat.", icon: <GitCompare className="h-4 w-4 shrink-0" />, permiso: PERMISOS.comparacionCategorias.acceso },
      { href: "/gestion-productos/proveedores/lista", label: "Lista Proveedores", icon: <List className="h-4 w-4 shrink-0" />, permiso: PERMISOS.proveedores.lista },
    ],
  },
  {
    id: "tienda",
    label: "LISTA TIENDA",
    icon: <ShoppingBag className={iconClass} />,
    submodules: [
      { href: "/gestion-productos/tienda/comp-proveedores", label: "Comp. Proveedores", icon: <Link2 className="h-4 w-4 shrink-0" />, permiso: PERMISOS.tienda.acceso },
      { href: "/gestion-productos/tienda/control-aumento", label: "Control Aumento", icon: <TrendingUp className="h-4 w-4 shrink-0" />, permiso: PERMISOS.tienda.controlAumentos },
      { href: "/gestion-productos/tienda/control-stock", label: "Control Stock", icon: <PackageSearch className="h-4 w-4 shrink-0" />, permiso: PERMISOS.stock.acceso },
      { href: "/gestion-productos/tienda/calc-tintometrico", label: "Calc. Tintométrico", icon: <Pipette className="h-4 w-4 shrink-0" />, permiso: PERMISOS.tienda.tintoLts },
      { href: "/gestion-productos/tienda/calc-litros", label: "Calc. Litros", icon: <Droplets className="h-4 w-4 shrink-0" />, permiso: PERMISOS.tienda.tintoLts },
    ],
  },
];

const FINANZAS_MODULES: {
  id: FinanzasModuleId;
  label: string;
  icon: React.ReactNode;
  submodules: SubmoduleItem[];
}[] = [
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
        label: "Balance Vtas",
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
  if (pathname === "/" || pathname.startsWith("/gestion-productos/proveedores") || pathname.startsWith("/proveedores")) return "proveedores";
  if (pathname.startsWith("/gestion-productos/tienda") || pathname.startsWith("/tienda")) return "tienda";
  if (pathname.startsWith("/stock")) return "tienda";
  if (pathname.startsWith("/gestion-productos/pedidos") || pathname.startsWith("/pedidos")) return "pedidos";
  return "proveedores";
}

function isSubmoduleActive(pathname: string, href: string): boolean {
  if (href === "/gestion-productos/proveedores/sugeridos") return pathname === "/gestion-productos/proveedores/sugeridos" || pathname === "/proveedores/sugeridos";
  if (href === "/gestion-productos/proveedores/lista-precios") return pathname === "/gestion-productos/proveedores/lista-precios" || pathname === "/proveedores/lista-precios";
  if (href === "/gestion-productos/proveedores/comparacion-categorias")
    return pathname === "/gestion-productos/proveedores/comparacion-categorias" || pathname === "/proveedores/comparacion-categorias";
  if (href === "/gestion-productos/proveedores") return pathname === "/gestion-productos/proveedores" || pathname === "/proveedores" || pathname === "/";
  if (href === "/gestion-productos/proveedores/lista") return pathname === "/gestion-productos/proveedores/lista" || pathname === "/proveedores/lista";
  if (href === "/gestion-productos/tienda/control-stock") return pathname === "/gestion-productos/tienda/control-stock" || pathname === "/stock";
  if (href === "/finanzas/tesoreria")
    return pathname === "/finanzas/tesoreria" || pathname === "/finanzas";
  if (href === "/finanzas/deuda-proveedores") return pathname === "/finanzas/deuda-proveedores";
  if (href === "/finanzas/vencimientos-gastos") return pathname === "/finanzas/vencimientos-gastos";
  if (href === "/finanzas/venc-por-fecha") return pathname === "/finanzas/venc-por-fecha";
  if (href === "/finanzas/control-comprobantes") return pathname === "/finanzas/control-comprobantes";
  if (href === "/finanzas/balance/mensual")
    return pathname === "/finanzas/balance/mensual" || pathname === "/finanzas/balance";
  if (href === "/finanzas/balance/gastos") return pathname === "/finanzas/balance/gastos";
  if (href === "/finanzas/balance/gastos/catalogo") return pathname === "/finanzas/balance/gastos/catalogo";
  return pathname === href;
}

export default function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const pathModule = getOpenModule(pathname);
  const mainAreaId = getMainAppAreaIdFromPathname(pathname);
  const [openId, setOpenId] = useState<SidebarModuleId | null>(() => pathModule);

  const modulesForArea =
    mainAreaId === "gestion-productos"
      ? MODULES
      : mainAreaId === "finanzas"
        ? FINANZAS_MODULES
        : [];

  const visibleModules = modulesForArea.filter((module) =>
    module.submodules.some((sub) => {
      const selfAllowed = !sub.permiso || puede(rol, sub.permiso);
      const childAllowed =
        sub.children?.some((c) => !c.permiso || puede(rol, c.permiso)) ?? false;
      return selfAllowed || childAllowed;
    })
  );

  useEffect(() => {
    setOpenId(pathModule);
  }, [pathModule]);

  return (
    <aside className="sidebar-container w-60 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      <nav className="flex flex-col gap-0.5 px-4 pt-3 pb-4 overflow-y-auto" aria-label="Navegación principal">
        {visibleModules.length > 0 ? (
          visibleModules.map((module) => {
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
                    {module.submodules
                      .filter((sub) => {
                        const selfAllowed = !sub.permiso || puede(rol, sub.permiso);
                        const childAllowed =
                          sub.children?.some((c) => !c.permiso || puede(rol, c.permiso)) ?? false;
                        return selfAllowed || childAllowed;
                      })
                      .map((sub) => {
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

                            {sub.children && sub.children.length > 0 && (
                              <div className="ml-4 space-y-0.5">
                                {sub.children
                                  .filter((c) => !c.permiso || puede(rol, c.permiso))
                                  .map((c) => {
                                    const childActive = isSubmoduleActive(pathname, c.href);
                                    return (
                                      <Link
                                        key={c.href}
                                        href={c.href}
                                        className={cn(
                                          "group flex items-center gap-2 rounded-md py-1.5 pl-3 pr-2 text-sm font-medium text-sidebar-foreground transition-colors",
                                          "border-l-2 -ml-[2px] pl-[10px]",
                                          childActive
                                            ? "border-sidebar-indicator bg-sidebar-accent [&_svg]:text-sidebar-foreground"
                                            : "border-transparent [&_svg]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-foreground",
                                          c.isUrgente && "relative"
                                        )}
                                      >
                                        {c.icon}
                                        <span className="min-w-0 truncate">{c.label}</span>
                                      </Link>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
          <SyncStatusIndicator />
          <ImportStatusIndicator />
        </div>
        <div className="flex justify-center pt-2" aria-hidden>
          <div className="h-px w-[80%] bg-sidebar-foreground/70" />
        </div>
        <div className="flex flex-col gap-3 pt-3 w-full min-w-0">
          <SidebarMainAppArea esEditor={rol === "editor"} />
        </div>
        <div className="flex justify-center pt-2" aria-hidden>
          <div className="h-px w-[80%] bg-sidebar-foreground/70" />
        </div>
        <div className="w-full min-w-0 pt-3">
          <div className="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/10 p-2">
            <SelectorRol rolActual={rol} compact />
          </div>
        </div>
      </div>
    </aside>
  );
}
