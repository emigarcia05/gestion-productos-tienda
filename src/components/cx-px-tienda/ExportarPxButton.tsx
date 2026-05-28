"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarPxListaCxDiffAction } from "@/actions/cxPxTienda";
import { descargarExcelPxListaCx } from "@/lib/exportPxListaCxExcelClient";
import ModalSinProductosExportar from "@/components/cx-px-tienda/ModalSinProductosExportar";

export default function ExportarPxButton() {
  const [exportando, setExportando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await exportarPxListaCxDiffAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar.");
        return;
      }
      if (res.data.filas.length === 0) {
        setModalSinProductos(true);
        return;
      }
      descargarExcelPxListaCx(res.data.filas);
      toast.success(`${res.data.filas.length} producto(s) exportado(s).`);
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
        Control de precios: px lista (DUX) vs PX LISTA; tolerancia ±5 (102 vs 107 no exporta; vs 108 sí).
        Excel CODIGO + PORC UTILIDAD solo si hay diferencia
        </TooltipContent>
      </Tooltip>
    </>
  );
}
