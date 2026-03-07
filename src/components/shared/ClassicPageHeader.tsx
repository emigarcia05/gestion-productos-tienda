import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface ClassicPageHeaderProps {
  /** Título principal del módulo (h1). Fuente Geist aplicada vía layout. */
  title: string;
  /** Submódulo o contexto (h3). */
  subtitle?: string;
  /** Contenedor de acciones a la derecha (botones). Tamaño uniforme: h-10 px-4. */
  actions?: React.ReactNode;
  /** Clases adicionales del contenedor. */
  className?: string;
}

/**
 * Encabezado global compartido para páginas con layout clásico.
 * Flexbox: izquierda = columna con h1 + h3; derecha = slot de acciones.
 * Espaciado y estilos alineados con .section-header en globals.css.
 */
export default function ClassicPageHeader({
  title,
  subtitle,
  actions,
  className,
}: ClassicPageHeaderProps) {
  return (
    <header
      className={cn("section-header shrink-0 w-full bg-card", className)}
      role="banner"
    >
      <div className="section-header__inner flex flex-nowrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="section-header__bar" aria-hidden />
          <div className="min-w-0 flex flex-col gap-0.5">
            <h1 className="section-header__titulo">{title}</h1>
            {subtitle != null && subtitle !== "" && (
              <h3 className="section-header__subtitulo">{subtitle}</h3>
            )}
          </div>
        </div>
        {actions != null && (
          <div className="section-header-actions flex flex-wrap items-center justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      <Separator className="section-header-divider bg-border" />
    </header>
  );
}
