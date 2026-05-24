"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarPxListaCxDiffAction } from "@/actions/cxPxTienda";
import { descargarExcelPxListaCx } from "@/lib/exportPxListaCxExcelClient";

export default function ExportarPxButton() {
  const [exportando, setExportando] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await exportarPxListaCxDiffAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar.");
        return;
      }
      if (res.data.filas.length === 0) {
        toast.message(
          "No hay productos con diferencia entre px lista DUX y PX LISTA configurado en Cx & Px."
        );
        return;
      }
      descargarExcelPxListaCx(res.data.filas);
      toast.success(`${res.data.filas.length} producto(s) exportado(s).`);
    } finally {
      setExportando(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          disabled={exportando}
          onClick={() => void handleExportar()}
        >
          <Download className="h-4 w-4 shrink-0" />
          {exportando ? "Exportando..." : "Exportar Px"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Excel con CODIGO y PORC UTILIDAD (marcación); solo ítems donde px lista DUX ≠ PX LISTA
      </TooltipContent>
    </Tooltip>
  );
}
