import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ACTION_BUTTON_SECONDARY } from "@/lib/actionButtons";

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

/** Input de búsqueda: placeholder en negrita y gris; texto oscuro al escribir. Foco #0072BB. */
export const INPUT_FILTER_CLASS =
  "bg-white border border-slate-300 rounded-lg h-9 text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-bold focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** SelectTrigger en filtros: placeholder en negrita; valor seleccionado texto oscuro. Foco #0072BB. */
export const SELECT_TRIGGER_FILTER_CLASS =
  "bg-white border-slate-300 rounded-lg h-9 text-sm text-slate-900 data-[placeholder]:text-slate-400 data-[placeholder]:font-bold focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20";

/** Clase para el indicador de cantidad de elementos filtrados (siempre #0072BB). Reutilizable en todos los filtros. */
export const FILTER_COUNT_CLASS =
  "text-sm text-[#0072BB] tabular-nums shrink-0 font-semibold";

/** Botón de limpieza global: icono + texto "Limpiar Filtros". A la derecha del input de búsqueda. Hereda estilo maestro de botones de acción. */
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
          size="default"
          onClick={onClick}
          className={cn("h-10 px-4 gap-1.5 shrink-0", ACTION_BUTTON_SECONDARY)}
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
