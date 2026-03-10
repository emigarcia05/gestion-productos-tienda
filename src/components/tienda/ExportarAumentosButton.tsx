"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TablaAumentosHandle } from "./TablaAumentos";

const INSTRUCTOR_DELAY_MS = 1500;

interface Props {
  tableRef: React.RefObject<TablaAumentosHandle | null>;
  /** Se llama tras disparar la exportación (después de un breve delay, cuando ya se abrió el diálogo de guardar). */
  onAfterExport?: () => void;
}

export default function ExportarAumentosButton({ tableRef, onAfterExport }: Props) {
  function handleClick() {
    tableRef.current?.triggerExport();
    if (onAfterExport) {
      setTimeout(onAfterExport, INSTRUCTOR_DELAY_MS);
    }
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
          Exportar .csv
        </Button>
      </TooltipTrigger>
      <TooltipContent>Descargar variaciones en Excel</TooltipContent>
    </Tooltip>
  );
}
