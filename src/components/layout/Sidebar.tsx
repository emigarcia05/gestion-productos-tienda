"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Handshake,
  ShoppingBag,
  PackageSearch,
  ClipboardList,
  ChevronDown,
  AlarmClock,
  FileSearch,
  List,
  Link2,
  TrendingUp,
  RotateCw,
  Pipette,
  History,
  User,
  GitCompare,
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
import type { Rol } from "@/lib/permisos";
import { PERMISOS, puede } from "@/lib/permisos";

const iconClass = "h-5 w-5 shrink-0";

type ModuleId = "proveedores" | "tienda" | "pedidos";

interface SubmoduleItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isUrgente?: boolean;
  /** Permiso para ver este enlace (por rol). Si no se define, solo editor. */
  permiso?: { simple: boolean; editor: boolean };
}

const MODULES: {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
  submodules: SubmoduleItem[];
}[] = [
  {
    id: "proveedores",
    label: "LISTA PROVEEDORES",
    icon: <Handshake className={iconClass} />,
    submodules: [
      { href: "/proveedores/sugeridos", label: "Px. vta. sugeridos", icon: <FileSearch className="h-4 w-4 shrink-0" />, permiso: PERMISOS.proveedores.sugeridos },
      { href: "/proveedores/lista-precios", label: "Lista precios", icon: <FileSearch className="h-4 w-4 shrink-0" />, permiso: PERMISOS.proveedores.listaPrecios },
      { href: "/proveedores/comparacion-categorias", label: "Comp. por cat.", icon: <GitCompare className="h-4 w-4 shrink-0" />, permiso: PERMISOS.comparacionCategorias.acceso },
      { href: "/proveedores/lista", label: "Lista proveedores", icon: <List className="h-4 w-4 shrink-0" />, permiso: PERMISOS.proveedores.lista },
    ],
  },
  {
    id: "tienda",
    label: "LISTA TIENDA",
    icon: <ShoppingBag className={iconClass} />,
    submodules: [
      { href: "/tienda", label: "Comp. px. prov.", icon: <Link2 className="h-4 w-4 shrink-0" />, permiso: PERMISOS.tienda.acceso },
      { href: "/tienda/aumentos", label: "Control aumentos", icon: <TrendingUp className="h-4 w-4 shrink-0" />, permiso: PERMISOS.tienda.controlAumentos },
      { href: "/stock", label: "Control stock", icon: <PackageSearch className="h-4 w-4 shrink-0" />, permiso: PERMISOS.stock.acceso },
    ],
  },
  {
    id: "pedidos",
    label: "PEDIDO MERCADERÍA",
    icon: <ClipboardList className={iconClass} />,
    submodules: [
      { href: "/pedidos/urgente", label: "Pedido urgente", icon: <AlarmClock className="h-4 w-4 shrink-0 text-accent2" />, isUrgente: true, permiso: PERMISOS.pedidos.acceso },
      { href: "/pedidos/tintometrico", label: "Pedido tintométrico", icon: <Pipette className="h-4 w-4 shrink-0" />, permiso: PERMISOS.pedidos.acceso },
      { href: "/pedidos/reposicion", label: "Pedido reposición", icon: <RotateCw className="h-4 w-4 shrink-0" />, permiso: PERMISOS.pedidos.acceso },
      { href: "/pedidos/historial", label: "Historial pedidos", icon: <History className="h-4 w-4 shrink-0" />, permiso: PERMISOS.pedidos.acceso },
    ],
  },
];

function getOpenModule(pathname: string): ModuleId {
  if (pathname === "/" || pathname.startsWith("/proveedores")) return "proveedores";
  if (pathname.startsWith("/tienda")) return "tienda";
  if (pathname.startsWith("/stock")) return "tienda";
  if (pathname.startsWith("/pedidos")) return "pedidos";
  return "proveedores";
}

function isSubmoduleActive(pathname: string, href: string): boolean {
  if (href === "/proveedores/sugeridos") return pathname === "/proveedores/sugeridos";
  if (href === "/proveedores/lista-precios") return pathname === "/proveedores/lista-precios";
  if (href === "/proveedores/comparacion-categorias") return pathname === "/proveedores/comparacion-categorias";
  if (href === "/proveedores") return pathname === "/proveedores" || pathname === "/" || /^\/proveedores\/[^/]+$/.test(pathname);
  if (href === "/proveedores/lista") return pathname === "/proveedores/lista";
  if (href === "/stock") return pathname === "/stock";
  return pathname === href;
}

export default function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();
  const pathModule = getOpenModule(pathname);
  const [openId, setOpenId] = useState<ModuleId | null>(() => pathModule);

  useEffect(() => {
    setOpenId(pathModule);
  }, [pathModule]);

  const perfilNombre = rol === "editor" ? "Editor" : "Simple";

  return (
    <aside className="sidebar-container w-60 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
      <nav className="flex flex-col gap-0.5 p-4 overflow-y-auto" aria-label="Navegación principal">
        {MODULES.filter((module) =>
          module.submodules.some((sub) => !sub.permiso || puede(rol, sub.permiso))
        ).map((module) => {
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
                    .filter((sub) => !sub.permiso || puede(rol, sub.permiso))
                    .map((sub) => {
                    const active = isSubmoduleActive(pathname, sub.href);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md py-2 pl-3 pr-2 text-sm font-medium text-sidebar-foreground transition-colors",
                          "border-l-2 -ml-[2px] pl-[10px]",
                          active
                            ? "border-sidebar-indicator bg-sidebar-accent [&_svg]:text-sidebar-foreground"
                            : "border-transparent [&_svg]:text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:[&_svg]:text-sidebar-foreground",
                          active && sub.isUrgente && "[&_svg]:text-accent2",
                          sub.isUrgente && "relative"
                        )}
                      >
                        {sub.icon}
                        <span className="min-w-0 truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col">
        <div className="px-4 pb-2 flex flex-col gap-2">
          <SyncStatusIndicator />
          <ImportStatusIndicator />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-2.5 backdrop-blur-sm">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary-foreground"
              aria-hidden
            >
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 [&_button]:!text-sidebar-foreground [&_button:hover]:!text-sidebar-foreground [&_svg]:text-inherit">
              <p className="text-sm font-medium text-sidebar-foreground">{perfilNombre}</p>
              <SelectorRol rolActual={rol} compact />
            </div>
          </div>
        </div>
        <div className="px-4 py-4 flex justify-center">
          <div className="w-full max-w-[45%] flex justify-center items-center">
            <Image
              src="/logo_tiendacolor.png"
              alt="Logo de la empresa"
              width={200}
              height={100}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
