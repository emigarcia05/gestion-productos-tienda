import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
  titulo: string;
  /** Nombre del submódulo actual (menor jerarquía, debajo del título) */
  subtitulo?: string;
  /** Botones de acción a la derecha; tamaño uniforme obligatorio (h-10 px-4) */
  actions?: React.ReactNode;
  /** @deprecated El espaciado es siempre el mismo (clase global .section-header) */
  compact?: boolean;
}

export default function SectionHeader({ titulo, subtitulo, actions }: Props) {
  return (
    <header className={cn("section-header shrink-0 w-full")}>
      <div className="section-header__inner flex flex-nowrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="section-header__bar" aria-hidden />
          <div className="min-w-0">
            <h1 className="section-header__titulo">{titulo}</h1>
            {subtitulo && (
              <h3 className="section-header__subtitulo">{subtitulo}</h3>
            )}
          </div>
        </div>
        {actions && (
          <div className="section-header-actions flex flex-wrap items-center justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      <Separator className="section-header-divider" />
    </header>
  );
}
