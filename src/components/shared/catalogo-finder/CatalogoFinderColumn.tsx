import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CATALOGO_FINDER_COLUMN_HEADER_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_SUBTITLE_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_TITLE_CLASS,
  CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS,
  CATALOGO_FINDER_COLUMN_NOVO_BUTTON_COMPACT_CLASS,
  TABLE_ROW_ACTION_ICON_CLASS,
} from "@/lib/ui-classes";

export default function CatalogoFinderColumn({
  titulo,
  subtitulo,
  mostrarNuevo,
  onNuevo,
  deshabilitada = false,
  /** Alineación del botón `+` respecto al título (default: derecha, como Catálogo Gastos). */
  nuevoLado = "end",
  children,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  mostrarNuevo: boolean;
  onNuevo?: () => void;
  deshabilitada?: boolean;
  nuevoLado?: "start" | "end";
  children: React.ReactNode;
  className?: string;
}) {
  const headerCompacto = !subtitulo;
  const novoClass = headerCompacto
    ? CATALOGO_FINDER_COLUMN_NOVO_BUTTON_COMPACT_CLASS
    : CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS;
  const spacerClass = cn("shrink-0", headerCompacto ? "size-6" : "size-7");

  const botonNuevo = mostrarNuevo ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onNuevo}
      className={novoClass}
      title="Nuevo"
      aria-label="Nuevo"
    >
      <Plus className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
    </Button>
  ) : (
    <span className={spacerClass} aria-hidden />
  );

  const tituloBlock = (
    <div className="min-w-0 max-w-full text-center">
      <h2 className={CATALOGO_FINDER_COLUMN_HEADER_TITLE_CLASS}>{titulo}</h2>
      {subtitulo && (
        <p className={CATALOGO_FINDER_COLUMN_HEADER_SUBTITLE_CLASS}>{subtitulo}</p>
      )}
    </div>
  );

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        deshabilitada && "opacity-95",
        className
      )}
    >
      <header
        className={
          headerCompacto
            ? CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS
            : CATALOGO_FINDER_COLUMN_HEADER_CLASS
        }
      >
        {nuevoLado === "start" ? (
          <>
            <div className="flex min-w-0 items-center justify-start">{botonNuevo}</div>
            {tituloBlock}
            <span className="min-w-0" aria-hidden />
          </>
        ) : (
          <>
            <span className="min-w-0" aria-hidden />
            {tituloBlock}
            <div className="flex min-w-0 items-center justify-end">{botonNuevo}</div>
          </>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}
