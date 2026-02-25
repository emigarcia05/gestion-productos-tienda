"use client";

import Link from "next/link";
import { Link2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TiendaSubmoduleKey = "productos" | "aumentos";

export default function TiendaSubmoduleToolbar({ activo }: { activo: TiendaSubmoduleKey }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "rounded-lg border-2 font-semibold transition-colors duration-150",
          activo === "productos"
            ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
            : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"
        )}
        asChild
      >
        <Link href="/tienda" className="gap-2">
          <Link2 className="h-4 w-4 shrink-0" />
          Productos Relacionados
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "rounded-lg border-2 font-semibold transition-colors duration-150",
          activo === "aumentos"
            ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
            : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"
        )}
        asChild
      >
        <Link href="/tienda/aumentos" className="gap-2">
          <TrendingUp className="h-4 w-4 shrink-0" />
          Control de Aumentos
        </Link>
      </Button>
    </div>
  );
}
