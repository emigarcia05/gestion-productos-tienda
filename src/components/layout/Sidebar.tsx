"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Handshake, ShoppingBag, PackageSearch, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/", label: "Inicio", icon: <Home className="h-5 w-5 shrink-0" /> },
    { href: "/proveedores", label: "Proveedores", icon: <Handshake className="h-5 w-5 shrink-0" /> },
    { href: "/tienda", label: "Tienda", icon: <ShoppingBag className="h-5 w-5 shrink-0" /> },
    { href: "/stock", label: "Stock", icon: <PackageSearch className="h-5 w-5 shrink-0" /> },
    { href: "/pedidos", label: "Pedidos", icon: <ClipboardList className="h-5 w-5 shrink-0" /> },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card p-4 flex flex-col gap-1">
      <nav className="flex flex-col gap-1" aria-label="Módulos principales">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
