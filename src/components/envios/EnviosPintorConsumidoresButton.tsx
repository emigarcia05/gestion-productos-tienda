"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS, TABLE_ROW_ACTION_ICON_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  pintorNombre: string;
  activo?: boolean;
  onClick: () => void;
}

export default function EnviosPintorConsumidoresButton({ pintorNombre, activo = false, onClick }: Props) {
  return (
    <Button
      type="button"
      variant={activo ? "default" : "ghost"}
      size="icon"
      className={cn(!activo && CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS)}
      title={activo ? "Quitar filtro de pintor" : "Filtrar clientes de este pintor"}
      aria-label={
        activo
          ? `Quitar filtro de ${pintorNombre}`
          : `Filtrar clientes asociados a ${pintorNombre}`
      }
      aria-pressed={activo}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Users className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
    </Button>
  );
}
