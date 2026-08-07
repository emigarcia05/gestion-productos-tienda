import { cn } from "@/lib/utils";

/**
 * Separador entre módulos de **primera jerarquía** del sidebar.
 * No usar dentro de paneles anidados (indent + chevron bastan).
 */
export default function SidebarNavDivider({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("sidebar-nav-divider", className)} aria-hidden />;
}
