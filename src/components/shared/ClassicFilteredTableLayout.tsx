import { cn } from "@/lib/utils";
import ClassicPageHeader from "./ClassicPageHeader";

export interface ClassicFilteredTableLayoutProps {
  /** Título del módulo (h1 en el header). */
  title: string;
  /** Submódulo o contexto (h3 en el header). */
  subtitle?: string;
  /** Botones/acciones en la zona derecha del header. */
  actions?: React.ReactNode;
  /** Contenedor de filtros (inputs, selects). Padding y gap consistentes. */
  filters?: React.ReactNode;
  /** Contenido principal: tabla o DataTable. Ocupa el espacio restante con scroll. */
  children: React.ReactNode;
  /** Clases del contenedor raíz. */
  className?: string;
  /** Clases del área de contenido (filtros + tabla). */
  contentClassName?: string;
}

const LAYOUT_PADDING = "px-4 sm:px-6 lg:px-8";
/** Sin gap entre bloque de filtros y tabla: el espacio lo da el margin-bottom del recuadro de filtros (--espacio-filtros-vertical) para mantener simetría con el padding-top del contenido. */
const CONTENT_GAP = "gap-0";

/**
 * Template de página reutilizable: Header (título + subtítulo + acciones) + Filtros + Tabla.
 * Genérico: reutilizable en cualquier ruta inyectando title, subtitle, actions, filters y children.
 * Espacios: padding y gap consistentes en toda la app.
 */
export default function ClassicFilteredTableLayout({
  title,
  subtitle,
  actions,
  filters,
  children,
  className,
  contentClassName,
}: ClassicFilteredTableLayoutProps) {
  return (
    <div
      className={cn(
        "h-full min-h-0 flex flex-col overflow-hidden bg-gris",
        className
      )}
    >
      <ClassicPageHeader title={title} subtitle={subtitle} actions={actions} />

      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col overflow-hidden max-w-7xl mx-auto w-full",
          "contenedor-pagina-con-filtros",
          LAYOUT_PADDING,
          CONTENT_GAP,
          contentClassName
        )}
      >
        {filters != null && (
          <div className="shrink-0 w-full" role="search" aria-label="Filtros">
            {filters}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto w-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
