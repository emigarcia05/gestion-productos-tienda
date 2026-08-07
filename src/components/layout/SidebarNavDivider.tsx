import { cn } from "@/lib/utils";

export type SidebarNavDividerLevel = 1 | 2 | 3;

/**
 * Separador entre opciones hermanas del sidebar.
 * El nivel ajusta contraste (no grosor): 1 módulos, 2 submódulos, 3 hojas (muy suave).
 */
export default function SidebarNavDivider({
  level = 1,
  className,
}: {
  level?: SidebarNavDividerLevel;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sidebar-nav-divider",
        level === 1 && "sidebar-nav-divider--level-1",
        level === 2 && "sidebar-nav-divider--level-2",
        level === 3 && "sidebar-nav-divider--level-3",
        className
      )}
      aria-hidden
    />
  );
}
