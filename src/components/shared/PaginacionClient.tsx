"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Paginación para tablas con datos cargados en cliente (sin navegación por URL).
 * Misma UI que PaginacionTabla pero con callback onPaginaChange.
 */
interface Props {
  paginaActual: number;
  totalPaginas: number;
  onPaginaChange: (pagina: number) => void;
}

export default function PaginacionClient({
  paginaActual,
  totalPaginas,
  onPaginaChange,
}: Props) {
  if (totalPaginas <= 1) return null;

  const paginas: (number | "...")[] = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= paginaActual - 2 && i <= paginaActual + 2)) {
      paginas.push(i);
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...");
    }
  }

  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={paginaActual === 1}
        onClick={() => onPaginaChange(1)}
        aria-label="Primera página"
      >
        <ChevronsLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={paginaActual === 1}
        onClick={() => onPaginaChange(paginaActual - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      {paginas.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === paginaActual ? "default" : "outline"}
            size="icon"
            className={cn("h-7 w-7 text-xs", p === paginaActual && "font-semibold")}
            onClick={() => onPaginaChange(p as number)}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={paginaActual === totalPaginas}
        onClick={() => onPaginaChange(paginaActual + 1)}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={paginaActual === totalPaginas}
        onClick={() => onPaginaChange(totalPaginas)}
        aria-label="Última página"
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
