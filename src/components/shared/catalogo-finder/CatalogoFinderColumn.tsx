import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CATALOGO_FINDER_COLUMN_HEADER_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_SUBTITLE_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_TITLE_CLASS,
  CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS,
} from "@/lib/ui-classes";

export default function CatalogoFinderColumn({
  titulo,
  subtitulo,
  mostrarNuevo,
  onNuevo,
  deshabilitada = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  mostrarNuevo: boolean;
  onNuevo?: () => void;
  deshabilitada?: boolean;
  children: React.ReactNode;
}) {
  const headerCompacto = !subtitulo;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        deshabilitada && "opacity-95"
      )}
    >
      <header
        className={
          headerCompacto
            ? CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS
            : CATALOGO_FINDER_COLUMN_HEADER_CLASS
        }
      >
        <span className="min-w-0" aria-hidden />
        <div className="min-w-0 max-w-full text-center">
          <h2 className={CATALOGO_FINDER_COLUMN_HEADER_TITLE_CLASS}>{titulo}</h2>
          {subtitulo && (
            <p className={CATALOGO_FINDER_COLUMN_HEADER_SUBTITLE_CLASS}>{subtitulo}</p>
          )}
        </div>
        <div className="flex min-w-0 justify-end">
          {mostrarNuevo ? (
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={onNuevo}
              className={cn(
                CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS,
                !headerCompacto &&
                  "size-6 [&_svg:not([class*='size-'])]:size-3"
              )}
              title="Nuevo"
              aria-label="Nuevo"
            >
              <Plus aria-hidden />
            </Button>
          ) : (
            <span className="size-4 shrink-0" aria-hidden />
          )}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}
