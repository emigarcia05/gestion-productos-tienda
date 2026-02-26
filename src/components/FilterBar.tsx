import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
        "filtros-contenedor flex flex-col gap-y-2 py-2",
        className
      )}
      role="search"
      aria-label="Filtros de búsqueda"
    >
      {children}
    </div>
  );
}

/** Fila 1 (Selección): solo menús desplegables (Select). Sin labels; placeholders en el trigger. */
export function FilterRowSelection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {children}
    </div>
  );
}

/** Fila 2 (Búsqueda): input de texto. Ocupa ~75% dejando espacio al botón de limpieza; borde #0072BB cuando activo. */
export function FilterRowSearch({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-[75%] max-w-2xl min-w-0", className)}>
      {children}
    </div>
  );
}

/** Input de búsqueda: placeholder gris cuando vacío, texto oscuro al escribir. Foco #0072BB. */
export const INPUT_FILTER_CLASS =
  "bg-white border border-slate-300 rounded-lg h-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** SelectTrigger en filtros: placeholder (inactivo) gris; valor seleccionado texto oscuro. Foco #0072BB. */
export const SELECT_TRIGGER_FILTER_CLASS =
  "bg-white border-slate-300 rounded-lg h-9 text-sm text-slate-900 data-[placeholder]:text-slate-400 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** Botón de limpieza global: icono + texto "Limpiar Filtros". Inmediatamente al lado del input de búsqueda. */
export function LimpiarFiltrosButton({
  onClick,
  visible,
}: {
  onClick: () => void;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClick}
          className="h-9 shrink-0 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium text-sm"
          aria-label="Limpiar todos los filtros"
        >
          <Trash2 className="h-[18px] w-[18px]" />
          Limpiar Filtros
        </Button>
      </TooltipTrigger>
      <TooltipContent>Limpiar todos los filtros</TooltipContent>
    </Tooltip>
  );
}
