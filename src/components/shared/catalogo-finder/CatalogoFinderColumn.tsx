import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CATALOGO_FINDER_COLUMN_HEADER_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS,
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
        className={cn(
          headerCompacto
            ? CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS
            : CATALOGO_FINDER_COLUMN_HEADER_CLASS
        )}
      >
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="truncate text-[11px] text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        {mostrarNuevo && (
          <Button
            type="button"
            size="icon-xs"
            onClick={onNuevo}
            className={cn(
              headerCompacto && CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS,
              !headerCompacto && "shrink-0"
            )}
            title="Nuevo"
            aria-label="Nuevo"
          >
            <Plus aria-hidden />
          </Button>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}
