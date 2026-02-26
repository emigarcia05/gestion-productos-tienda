"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ACTION_BUTTON_SECONDARY } from "@/lib/actionButtons";
import type { TablaStockHandle } from "./TablaStock";

interface Props {
  tableRef: React.RefObject<TablaStockHandle | null>;
}

export default function ImprimirStockButton({ tableRef }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${ACTION_BUTTON_SECONDARY}`}
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
