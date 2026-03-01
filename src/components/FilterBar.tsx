import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** Fila 1 (Selección): solo menús desplegables (Select). items-center + gap-3 para alineación con inputs. */
export function FilterRowSelection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
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

/** Color de fuente de todos los filtros (heredable). Usa variable de tema. */
export const FILTER_TEXT_COLOR_CLASS = "text-foreground";

/**
 * Clase global única para input y SelectTrigger de filtros (SSOT en globals.css).
 * Un cambio en .input-filtro-unificado se propaga a todos los filtros.
 */
export const INPUT_FILTER_CLASS = "input-filtro-unificado";

/**
 * Wrapper para cada Select de filtros. Con flex-1 min-w-0, hasta 5 desplegables
 * entran en una fila repartiendo el ancho por igual. Heredable.
 */
export const FILTER_SELECT_WRAPPER_CLASS = "min-w-0 flex-1";

/** Misma clase global que INPUT_FILTER_CLASS: un solo estilo para input y trigger. */
export const SELECT_TRIGGER_FILTER_CLASS = "input-filtro-unificado";

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
    <Button
      type="button"
      variant="primaryIcon"
      size="icon-lg"
      onClick={onClick}
      className="h-10 min-h-10 shrink-0"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
