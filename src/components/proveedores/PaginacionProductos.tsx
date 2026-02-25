"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  paginaActual: number;
  totalPaginas: number;
  total: number;
  pageSize: number;
  q: string;
  proveedor: string;
  basePath?: string;
  extraParams?: Record<string, string>;
}

function buildHref(
  pagina: number,
  q: string,
  proveedor: string,
  basePath = "/proveedores",
  extraParams: Record<string, string> = {}
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (proveedor) params.set("proveedor", proveedor);
  for (const [k, v] of Object.entries(extraParams)) {
    if (v) params.set(k, v);
  }
  params.set("pagina", String(pagina));
  return `${basePath}?${params.toString()}`;
}

export default function PaginacionProductos({ paginaActual, totalPaginas, total, pageSize, q, proveedor, basePath, extraParams }: Props) {
  const desde = Math.min((paginaActual - 1) * pageSize + 1, total);
  const hasta = Math.min(paginaActual * pageSize, total);

  if (totalPaginas <= 1) return (
    <p className="text-xs text-accent2">
      {total.toLocaleString()} producto{total !== 1 ? "s" : ""}
    </p>
  );

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
      <p className="text-xs text-accent2">
        {desde.toLocaleString()}–{hasta.toLocaleString()} de {total.toLocaleString()}
      </p>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={paginaActual === 1}>
          <Link href={buildHref(1, q, proveedor, basePath, extraParams)}><ChevronsLeft className="h-3.5 w-3.5" /></Link>
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={paginaActual === 1}>
          <Link href={buildHref(paginaActual - 1, q, proveedor, basePath, extraParams)}><ChevronLeft className="h-3.5 w-3.5" /></Link>
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
              asChild
            >
              <Link href={buildHref(p as number, q, proveedor, basePath, extraParams)}>{p}</Link>
            </Button>
          )
        )}

        <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={paginaActual === totalPaginas}>
          <Link href={buildHref(paginaActual + 1, q, proveedor, basePath, extraParams)}><ChevronRight className="h-3.5 w-3.5" /></Link>
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" asChild disabled={paginaActual === totalPaginas}>
          <Link href={buildHref(totalPaginas, q, proveedor, basePath, extraParams)}><ChevronsRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </div>
  );
}
