"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS, TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  pintorNombre: string;
  onClick: () => void;
}

export default function EnviosPintorConsumidoresButton({ pintorNombre, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS)}
      title="Consumidores finales"
      aria-label={`Ver consumidores finales de ${pintorNombre}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Users className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
    </Button>
  );
}
