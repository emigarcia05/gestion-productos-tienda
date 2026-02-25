"use client";

import Link from "next/link";
import { Zap, RotateCw, Pipette, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PedidosTabKey } from "@/lib/pedidosTabs";

const TABS: { key: PedidosTabKey; label: string; href: string; icon: React.ElementType; isPrimary?: boolean }[] = [
  { key: "urgente", label: "Pedido Urgente", href: "/pedidos/urgente", icon: Zap },
  { key: "tintometrico", label: "Pedido Tintométrico", href: "/pedidos/tintometrico", icon: Pipette },
  { key: "reposicion", label: "Pedido Reposición", href: "/pedidos/reposicion", icon: RotateCw },
  { key: "generar", label: "Generar Pedido", href: "/pedidos/generar", icon: FileOutput, isPrimary: true },
];

export default function PedidosSectionActions({ activo }: { activo: PedidosTabKey }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {TABS.map((tab) => {
        const active = activo === tab.key;
        const Icon = tab.icon;
        const isUrgente = tab.key === "urgente";
        const isPrimaryAction = tab.isPrimary;

        if (isPrimaryAction) {
          return (
            <Button
              key={tab.key}
              variant={active ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-lg font-semibold transition-colors duration-150",
                active ? "" : "border-2 border-slate-300 hover:border-primary hover:text-primary"
              )}
              asChild
            >
              <Link href={tab.href} className="gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </Link>
            </Button>
          );
        }

        return (
          <Button
            key={tab.key}
            variant="outline"
            size="sm"
            className={cn(
              "rounded-lg border-2 font-semibold transition-colors duration-150",
              active
                ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                : "border-slate-300 text-slate-700 hover:border-primary hover:text-primary"
            )}
            asChild
          >
            <Link href={tab.href} className="gap-2">
              {isUrgente ? (
                <Zap className="h-4 w-4 shrink-0 text-[#FFC107]" />
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
