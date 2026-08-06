import { cn } from "@/lib/utils";

/**
 * Separador suave entre opciones del sidebar.
 * Empieza alineado al ícono (margen izquierdo) y llega al borde derecho del hover.
 */
export default function SidebarNavDivider({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("sidebar-nav-divider", className)} aria-hidden />;
}
