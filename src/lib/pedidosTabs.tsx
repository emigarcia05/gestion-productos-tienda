import { AlarmClock, RotateCw, Pipette, History } from "lucide-react";

export const PEDIDOS_TAB_KEYS = ["urgente", "tintometrico", "reposicion", "historial"] as const;
export type PedidosTabKey = (typeof PEDIDOS_TAB_KEYS)[number];

const TAB_CONFIG: Record<
  PedidosTabKey,
  { label: string; href: string; icon: React.ReactNode }
> = {
  urgente: {
    label: "Pedido Urgente",
    href: "/pedidos/urgente",
    icon: <AlarmClock className="h-3.5 w-3.5 text-[#FFC107]" />,
  },
  tintometrico: {
    label: "Pedido Tintométrico",
    href: "/pedidos/tintometrico",
    icon: <Pipette className="h-3.5 w-3.5 text-accent2" />,
  },
  reposicion: {
    label: "Pedido Reposición",
    href: "/pedidos/reposicion",
    icon: <RotateCw className="h-3.5 w-3.5 text-accent2" />,
  },
  historial: {
    label: "Historial Pedidos",
    href: "/pedidos/historial",
    icon: <History className="h-3.5 w-3.5 text-accent2" />,
  },
};

export interface TabItem {
  label: string;
  href?: string;
  active: boolean;
  icon?: React.ReactNode;
}

export function getPedidosTabs(activeKey: PedidosTabKey): TabItem[] {
  return PEDIDOS_TAB_KEYS.map((key) => {
    const config = TAB_CONFIG[key];
    return {
      label: config.label,
      href: config.href,
      active: key === activeKey,
      icon: config.icon,
    };
  });
}
