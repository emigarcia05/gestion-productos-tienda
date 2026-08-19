import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CATALOGO_FINDER_COLUMN_HEADER_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_SUBTITLE_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_TITLE_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_TITULO_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_TITULO_SUBTITLE_CLASS,
  CATALOGO_FINDER_COLUMN_HEADER_TITULO_TITLE_CLASS,
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
  /**
   * `finder`: barra `bg-primary` (catálogos).
   * `titulo`: mismo layout, tipografía de título de paso (wizard Envios).
   */
  headerVariant = "finder",
  children,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  mostrarNuevo: boolean;
  onNuevo?: () => void;
  deshabilitada?: boolean;
  nuevoLado?: "start" | "end";
  headerVariant?: "finder" | "titulo";
  children: React.ReactNode;
  className?: string;
}) {
  const esTitulo = headerVariant === "titulo";
  const headerCompacto = !subtitulo && !esTitulo;
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
      <h2
        className={
          esTitulo
            ? CATALOGO_FINDER_COLUMN_HEADER_TITULO_TITLE_CLASS
            : CATALOGO_FINDER_COLUMN_HEADER_TITLE_CLASS
        }
      >
        {titulo}
      </h2>
      {subtitulo ? (
        <p
          className={
            esTitulo
              ? CATALOGO_FINDER_COLUMN_HEADER_TITULO_SUBTITLE_CLASS
              : CATALOGO_FINDER_COLUMN_HEADER_SUBTITLE_CLASS
          }
        >
          {subtitulo}
        </p>
      ) : null}
    </div>
  );

  const headerClass = esTitulo
    ? CATALOGO_FINDER_COLUMN_HEADER_TITULO_CLASS
    : headerCompacto
      ? CATALOGO_FINDER_COLUMN_HEADER_COMPACT_CLASS
      : CATALOGO_FINDER_COLUMN_HEADER_CLASS;

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        esTitulo && "rounded-none border-0 bg-transparent shadow-none",
        deshabilitada && "opacity-95",
        className
      )}
    >
      <header className={headerClass}>
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
