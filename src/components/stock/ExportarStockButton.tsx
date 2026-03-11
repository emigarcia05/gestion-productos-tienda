"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TablaStockHandle } from "./TablaStock";

interface Props {
  tableRef: React.RefObject<TablaStockHandle | null>;
}

export default function ExportarStockButton({ tableRef }: Props) {
  function handleClick() {
    tableRef.current?.triggerExport();
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          onClick={handleClick}
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </TooltipTrigger>
      <TooltipContent>Descargar ajuste de stock en Excel 97-2003</TooltipContent>
    </Tooltip>
  );
}
