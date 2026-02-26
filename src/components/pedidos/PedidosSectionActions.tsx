"use client";

import Link from "next/link";
import { AlarmClock, RotateCw, Pipette, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PedidosTabKey } from "@/lib/pedidosTabs";

const TABS: { key: PedidosTabKey; label: string; href: string; icon: React.ElementType; isUrgente?: boolean }[] = [
  { key: "urgente", label: "Pedido Urgente", href: "/pedidos/urgente", icon: AlarmClock, isUrgente: true },
  { key: "tintometrico", label: "Pedido Tintométrico", href: "/pedidos/tintometrico", icon: Pipette },
  { key: "reposicion", label: "Pedido Reposición", href: "/pedidos/reposicion", icon: RotateCw },
  { key: "historial", label: "Historial Pedidos", href: "/pedidos/historial", icon: History },
];

export default function PedidosSectionActions({ activo }: { activo: PedidosTabKey }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {TABS.map((tab) => {
        const active = activo === tab.key;
        const Icon = tab.icon;
        const isUrgente = tab.isUrgente;

        return (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-lg transition-colors duration-150 relative",
              isUrgente && "pl-3 border-l-2 border-accent2",
              active
                ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
            asChild
          >
            <Link href={tab.href} className="gap-2">
              {isUrgente ? (
                <AlarmClock className="h-4 w-4 shrink-0 text-accent2" />
              ) : (
                <Icon className="h-4 w-4 shrink-0" />
              )}
              {tab.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
