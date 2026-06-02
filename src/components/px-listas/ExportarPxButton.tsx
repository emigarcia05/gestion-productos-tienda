"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarPxDiffAction } from "@/actions/pxListas";
import { descargarExcelPx } from "@/lib/exportPxExcelClient";
import { descargarPdfBase64 } from "@/lib/descargarPdfBase64";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";

export default function ExportarPxButton() {
  const [exportando, setExportando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await exportarPxDiffAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar.");
        return;
      }
      if (res.data.filas.length === 0) {
        setModalSinProductos(true);
        return;
      }
      descargarExcelPx(res.data.filas);
      descargarPdfBase64(res.data.pdfBase64, res.data.pdfFilename);
      toast.success(
        `${res.data.filas.length} producto(s) exportado(s) (Excel y PDF de aumentos).`
      );
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <ModalSinProductosExportar
        open={modalSinProductos}
        onOpenChange={setModalSinProductos}
      />
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
          Compara PX LISTA del módulo con DUX. Descarga Excel (CODIGO + marcación) y PDF con
          aumentos promedio por marca y rubro, solo donde hubo diferencias
        </TooltipContent>
      </Tooltip>
    </>
  );
}
