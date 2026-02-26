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

/** Color de fuente de todos los filtros (heredable). */
export const FILTER_TEXT_COLOR_CLASS = "text-black";

/** Input de búsqueda: placeholder en negrita y gris; fuente negra. Foco #0072BB. */
export const INPUT_FILTER_CLASS =
  `bg-white border border-slate-300 rounded-lg h-9 text-sm ${FILTER_TEXT_COLOR_CLASS} placeholder:text-slate-400 placeholder:font-bold focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20`;

/**
 * Estilo maestro para listas desplegables de filtros (SelectTrigger).
 * Heredable: usar solo esta constante en todos los filtros.
 * - Mismo tamaño (w-[200px]), fuente negra, máscara en negrita.
 */
export const SELECT_TRIGGER_FILTER_CLASS =
  `w-[200px] min-w-[200px] bg-white border border-slate-300 rounded-lg h-9 text-sm ${FILTER_TEXT_COLOR_CLASS} data-[placeholder]:text-slate-400 data-[placeholder]:font-bold focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20`;

/** Clase para el indicador de cantidad de elementos filtrados (siempre #0072BB). Reutilizable en todos los filtros. */
export const FILTER_COUNT_CLASS =
  "text-sm text-[#0072BB] tabular-nums shrink-0 font-semibold";

/**
 * Botón cuadrado con icono de tacho de basura, al lado del filtro de descripción.
 * Al apretarlo borra todos los filtros. Heredable: usar en todos los módulos con filtros.
 */
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
          size="icon"
          onClick={onClick}
          className="h-9 w-9 shrink-0 rounded-lg border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Limpiar todos los filtros"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Limpiar todos los filtros</TooltipContent>
    </Tooltip>
  );
}
