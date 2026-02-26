import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * FILTROS — Estilo madre reutilizable.
 * Para nuevos módulos: usar FilterBar > FilterRowSelection (con FILTER_SELECT_WRAPPER_CLASS
 * en cada Select) + fila con FilterRowSearch (INPUT_FILTER_CLASS) y LimpiarFiltrosButton.
 * Contador: FILTER_COUNT_CLASS. Colores y tipografía heredan de este archivo.
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

/** Fila 2 (Búsqueda): input de texto. Ocupa ~75% dejando espacio al botón de limpieza; borde primary cuando activo. */
export function FilterRowSearch({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-[75%] max-w-2xl min-w-0", className)}>
      {children}
    </div>
  );
}

/** Color de fuente de todos los filtros (heredable). Usa variable de tema para modo oscuro. */
export const FILTER_TEXT_COLOR_CLASS = "text-foreground";

/** Input de búsqueda: mismo bloque visual que Main Button (2.5rem, rounded-lg, font-semibold, sombra). Usar con pl-9 pr-8 para icono. Variables de tema para modo oscuro. */
export const INPUT_FILTER_CLASS =
  `bg-background border border-input rounded-lg h-10 min-h-10 text-sm font-semibold shadow-sm transition-[box-shadow,border-color] duration-150 ${FILTER_TEXT_COLOR_CLASS} placeholder:text-muted-foreground placeholder:font-bold focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20`;

/**
 * Wrapper para cada Select de filtros. Con flex-1 min-w-0, hasta 5 desplegables
 * entran en una fila repartiendo el ancho por igual. Heredable.
 */
export const FILTER_SELECT_WRAPPER_CLASS = "min-w-0 flex-1";

/**
 * Estilo maestro para listas desplegables de filtros (SelectTrigger).
 * Usar dentro de un div con FILTER_SELECT_WRAPPER_CLASS para que entren 5 en una fila.
 * Fuente negra, máscara en negrita.
 */
export const SELECT_TRIGGER_FILTER_CLASS =
  `w-full min-w-0 bg-background border border-input rounded-lg h-9 text-sm ${FILTER_TEXT_COLOR_CLASS} data-[placeholder]:text-muted-foreground data-[placeholder]:font-bold focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20`;

/** Clase para el indicador de cantidad de elementos filtrados (color primario del tema). Reutilizable en todos los filtros. */
export const FILTER_COUNT_CLASS =
  "text-sm text-primary tabular-nums shrink-0 font-semibold";

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
          className="h-10 w-10 shrink-0 rounded-lg border-border text-muted-foreground hover:bg-accent hover:text-foreground shadow-sm transition-[box-shadow] duration-150 hover:shadow-md"
          aria-label="Limpiar todos los filtros"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Limpiar todos los filtros</TooltipContent>
    </Tooltip>
  );
}
