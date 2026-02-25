"use client";

import Link from "next/link";
import { Zap, RotateCw, Pipette, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PedidosTabKey } from "@/lib/pedidosTabs";

const TABS: { key: PedidosTabKey; label: string; href: string; icon: React.ElementType }[] = [
  { key: "urgente", label: "Pedido Urgente", href: "/pedidos/urgente", icon: Zap },
  { key: "reposicion", label: "Pedido Reposición", href: "/pedidos/reposicion", icon: RotateCw },
  { key: "tintometrico", label: "Pedido Tintométrico", href: "/pedidos/tintometrico", icon: Pipette },
  { key: "generar", label: "Generar Pedido", href: "/pedidos/generar", icon: FileOutput },
];

export default function PedidosSectionActions({ activo }: { activo: PedidosTabKey }) {
  return (
    <>
      {TABS.map((tab) => {
        const active = activo === tab.key;
        const Icon = tab.icon;
        const isUrgente = tab.key === "urgente";
        return (
          <Button
            key={tab.key}
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(
              "transition-colors duration-150",
              active ? "hover:opacity-90" : "border-slate-200 hover:border-primary/40 hover:text-primary",
              active && isUrgente && "ring-1 ring-accent2/60 ring-offset-1"
            )}
            asChild
          >
            <Link href={tab.href} className="gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </Link>
          </Button>
        );
      })}
    </>
  );
}
