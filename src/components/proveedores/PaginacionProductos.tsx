"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  paginaActual: number;
  totalPaginas: number;
  total: number;
  pageSize: number;
}

export default function PaginacionProductos({ paginaActual, totalPaginas, total, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function irA(pagina: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", String(pagina));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const desde = Math.min((paginaActual - 1) * pageSize + 1, total);
  const hasta = Math.min(paginaActual * pageSize, total);

  if (totalPaginas <= 1) return null;

  // Páginas visibles alrededor de la actual
  const paginas: (number | "...")[] = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= paginaActual - 2 && i <= paginaActual + 2)) {
      paginas.push(i);
    } else if (paginas[paginas.length - 1] !== "...") {
      paginas.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-xs text-muted-foreground">
        {pending
          ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Cargando...</span>
          : `${desde.toLocaleString()}–${hasta.toLocaleString()} de ${total.toLocaleString()}`
        }
      </p>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => irA(1)} disabled={paginaActual === 1 || pending}>
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => irA(paginaActual - 1)} disabled={paginaActual === 1 || pending}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {paginas.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === paginaActual ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 text-xs"
              onClick={() => irA(p as number)}
              disabled={pending}
            >
              {p}
            </Button>
          )
        )}

        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => irA(paginaActual + 1)} disabled={paginaActual === totalPaginas || pending}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => irA(totalPaginas)} disabled={paginaActual === totalPaginas || pending}>
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
