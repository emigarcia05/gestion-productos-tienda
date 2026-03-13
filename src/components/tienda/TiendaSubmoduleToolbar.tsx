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
            ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        asChild
      >
        <Link href="/tienda" className="gap-2">
          <Link2 className="h-4 w-4 shrink-0" />
          Comp. Px. Prov.
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-lg transition-colors duration-150",
          activo === "aumentos"
            ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        asChild
      >
        <Link href="/tienda/aumentos" className="gap-2">
          <TrendingUp className="h-4 w-4 shrink-0" />
          Control Aumentos
        </Link>
      </Button>
    </div>
  );
}
