"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TablaStockHandle } from "./TablaStock";

interface Props {
  tableRef: React.RefObject<TablaStockHandle | null>;
}

export default function ImprimirStockButton({ tableRef }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          onClick={() => tableRef.current?.openPrint()}
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </TooltipTrigger>
      <TooltipContent>Imprimir listado de stock</TooltipContent>
    </Tooltip>
  );
}
