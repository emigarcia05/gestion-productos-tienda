import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        deshabilitada && "opacity-95"
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
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
            size="icon"
            onClick={onNuevo}
            className="size-6 shrink-0 rounded-md"
            title="Nuevo"
            aria-label="Nuevo"
          >
            <Plus className="size-3.5" aria-hidden />
          </Button>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}
