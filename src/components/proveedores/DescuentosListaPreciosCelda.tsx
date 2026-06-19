"use client";

import { Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

interface Props {
  fila: FilaListaPrecioParaCliente;
  onAbrir: () => void;
}

export default function DescuentosListaPreciosCelda({ fila, onAbrir }: Props) {
  const tieneDescuentos = (fila.descuentosActivos?.length ?? 0) > 0;

  return (
    <div className="flex h-full items-center justify-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!tieneDescuentos}
        className={cn(
          TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
          !tieneDescuentos && "opacity-40"
        )}
        aria-label={
          tieneDescuentos
            ? `Ver descuentos de ${fila.codExt}`
            : `Sin descuentos activos en ${fila.codExt}`
        }
        onClick={onAbrir}
      >
        <Percent className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
      </Button>
    </div>
  );
}
