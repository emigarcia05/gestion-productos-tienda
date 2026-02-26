"use client";

import Link from "next/link";
import { AlarmClock, RotateCw, Pipette, FileOutput } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "urgente", label: "Pedido Urgente", href: "/pedidos/urgente", icon: AlarmClock },
  { key: "reposicion", label: "Pedido Reposición", href: "/pedidos/reposicion", icon: RotateCw },
  { key: "tintometrico", label: "Pedido Tintométrico", href: "/pedidos/tintometrico", icon: Pipette },
  { key: "generar", label: "Generar Pedido", href: "/pedidos/generar", icon: FileOutput },
] as const;

export default function PedidosToolbar({ activo }: { activo: "urgente" | "reposicion" | "tintometrico" | "generar" }) {
  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = activo === tab.key;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-600 hover:bg-muted hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
