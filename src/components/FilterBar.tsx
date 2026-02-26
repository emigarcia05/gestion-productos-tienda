import { cn } from "@/lib/utils";

/**
 * Contenedor estándar para la barra de filtros.
 * Sistema de doble fila recomendado: FilterRowSelection (selects) + FilterRowSearch (búsqueda 75%).
 * Patrón: Header → FilterBar → Card (tabla).
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
        "flex flex-col gap-4 py-3",
        className
      )}
      role="search"
      aria-label="Filtros de búsqueda"
    >
      {children}
    </div>
  );
}

/** Fila 1 (Selección): solo menús desplegables (Select). Alineados a la izquierda, gap-4. */
export function FilterRowSelection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>
      {children}
    </div>
  );
}

/** Fila 2 (Búsqueda): input de texto. Ocupa 75% del ancho; borde #0072BB cuando activo. */
export function FilterRowSearch({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-[75%] max-w-2xl", className)}>
      {children}
    </div>
  );
}

/** Clases para Input de búsqueda: fondo blanco, borde definido, foco #0072BB (marca) */
export const INPUT_FILTER_CLASS =
  "bg-white border border-slate-300 rounded-lg h-9 text-sm text-slate-900 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** Clases para SelectTrigger en filtros: mismo estilo, foco #0072BB */
export const SELECT_TRIGGER_FILTER_CLASS =
  "bg-white border-slate-300 rounded-lg h-9 text-sm text-slate-900 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** Label encima de cada filtro: contraste y jerarquía */
export const FILTER_LABEL_CLASS =
  "text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5";
