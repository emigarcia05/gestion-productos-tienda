"use client";

import Link from "next/link";
import { FileSearch, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProveedoresSubmoduleKey = "consulta" | "lista";

export default function ProveedoresSubmoduleToolbar({ activo }: { activo: ProveedoresSubmoduleKey }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-lg transition-colors duration-150",
          activo === "consulta"
            ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        asChild
      >
        <Link href="/proveedores" className="gap-2">
          <FileSearch className="h-4 w-4 shrink-0" />
          Lista Proveedores
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-lg transition-colors duration-150",
          activo === "lista"
            ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        asChild
      >
        <Link href="/proveedores/lista" className="gap-2">
          <List className="h-4 w-4 shrink-0" />
          Lista Proveedores
        </Link>
      </Button>
    </div>
  );
}
