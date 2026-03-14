"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Paginación estándar para tablas: encabezado fijo + 100 ítems por página.
 * Construye enlaces con basePath + params; el parámetro "pagina" se actualiza en cada enlace.
 */
interface Props {
  basePath: string;
  /** Parámetros actuales de la URL (sin "pagina"); se incluyen en cada enlace. */
  params: Record<string, string>;
  paginaActual: number;
  totalPaginas: number;
  total: number;
  pageSize: number;
}

function buildHref(basePath: string, params: Record<string, string>, pagina: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, v);
  }
  p.set("pagina", String(pagina));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function PaginacionTabla({
  basePath,
  params,
  paginaActual,
  totalPaginas,
  total,
  pageSize,
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
      <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={paginaActual === 1}>
        <Link href={buildHref(basePath, params, 1)} aria-label="Primera página">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={paginaActual === 1}>
        <Link href={buildHref(basePath, params, paginaActual - 1)} aria-label="Página anterior">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
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
            asChild
          >
            <Link href={buildHref(basePath, params, p as number)}>{p}</Link>
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        asChild
        disabled={paginaActual === totalPaginas}
      >
        <Link href={buildHref(basePath, params, paginaActual + 1)} aria-label="Página siguiente">
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        asChild
        disabled={paginaActual === totalPaginas}
      >
        <Link href={buildHref(basePath, params, totalPaginas)} aria-label="Última página">
          <ChevronsRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
