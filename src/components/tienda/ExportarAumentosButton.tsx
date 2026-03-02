"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TablaAumentosHandle } from "./TablaAumentos";

interface Props {
  tableRef: React.RefObject<TablaAumentosHandle | null>;
}

export default function ExportarAumentosButton({ tableRef }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          onClick={() => tableRef.current?.triggerExport()}
        >
          <Download className="h-4 w-4" />
          Exportar .csv
        </Button>
      </TooltipTrigger>
      <TooltipContent>Descargar variaciones en Excel</TooltipContent>
    </Tooltip>
  );
}
