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
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-lg transition-colors duration-150",
          activo === "productos"
            ? "bg-[#0072BB]/10 text-primary font-semibold hover:bg-[#0072BB]/15"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        asChild
      >
        <Link href="/tienda" className="gap-2">
          <Link2 className="h-4 w-4 shrink-0" />
          Comparación Px Proveedores
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-lg transition-colors duration-150",
          activo === "aumentos"
            ? "bg-[#0072BB]/10 text-primary font-semibold hover:bg-[#0072BB]/15"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        asChild
      >
        <Link href="/tienda/aumentos" className="gap-2">
          <TrendingUp className="h-4 w-4 shrink-0" />
          Control aumentos
        </Link>
      </Button>
    </div>
  );
}
