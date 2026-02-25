"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, ShoppingBag, PackageSearch, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";
import SelectorRol from "@/components/SelectorRol";
import type { Rol } from "@/lib/permisos";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const iconClass = "h-5 w-5 shrink-0";

export default function Sidebar({ rol }: { rol: Rol }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/proveedores", label: "Lista de Proveedores", icon: <Handshake className={iconClass} /> },
    { href: "/tienda", label: "Tienda", icon: <ShoppingBag className={iconClass} /> },
    { href: "/stock", label: "Stock", icon: <PackageSearch className={iconClass} /> },
    { href: "/pedidos", label: "Pedidos", icon: <ClipboardList className={iconClass} /> },
  ];

  const perfilNombre = rol === "editor" ? "Editor" : "Simple";

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-slate-200 bg-slate-100">
      <nav className="flex flex-col gap-1 p-4" aria-label="Módulos principales">
        {items.map((item) => {
          const active =
            item.href === "/proveedores"
              ? pathname === "/" || pathname.startsWith("/proveedores")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-blue-50/80 text-primary [&_svg]:text-primary"
                  : "text-slate-600 hover:bg-primary/10 hover:text-primary [&_svg]:currentColor"
              )}
            >
              {active ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0" aria-hidden />
              )}
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white px-3 py-2.5 shadow-sm">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden
          >
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{perfilNombre}</p>
            <SelectorRol rolActual={rol} compact />
          </div>
        </div>
      </div>
    </aside>
  );
}
