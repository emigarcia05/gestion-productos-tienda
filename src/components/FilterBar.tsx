import { cn } from "@/lib/utils";

/**
 * Contenedor estándar para la barra de filtros (Soft UI).
 * Fila de filtros justo encima de la tabla, alineada a la izquierda.
 * Patrón: Sidebar → Header → Acciones (derecha) → FilterBar → Card (tabla).
 */
export default function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 py-3",
        className
      )}
      role="search"
      aria-label="Filtros de búsqueda"
    >
      {children}
    </div>
  );
}

/** Clases para Input de búsqueda: fondo blanco, borde sutil, foco marca #0072BB */
export const INPUT_FILTER_CLASS =
  "bg-white border-slate-200 rounded-lg h-9 text-sm focus-visible:border-primary focus-visible:ring-primary/20";

/** Clases para SelectTrigger en filtros: mismo estilo Soft UI */
export const SELECT_TRIGGER_FILTER_CLASS =
  "bg-white border-slate-200 rounded-lg h-9 text-sm focus-visible:border-primary focus-visible:ring-primary/20";
