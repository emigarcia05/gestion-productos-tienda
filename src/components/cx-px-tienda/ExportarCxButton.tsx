"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarCostoCxDiffAction } from "@/actions/cxPxTienda";
import { descargarExcelCostoCx } from "@/lib/exportCostoCxExcelClient";
import ModalSinProductosExportar from "@/components/cx-px-tienda/ModalSinProductosExportar";

export default function ExportarCxButton() {
  const [exportando, setExportando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await exportarCostoCxDiffAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar.");
        return;
      }
      if (res.data.filas.length === 0) {
        setModalSinProductos(true);
        return;
      }
      descargarExcelCostoCx(res.data.filas);
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
            {exportando ? "Exportando..." : "Exportar Cx"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Control de costos: compara costo compra (DUX) con CX PROD. (proveedor o promedio CX. PROM.).
          Excel CODIGO + COSTO solo si hay diferencia
        </TooltipContent>
      </Tooltip>
    </>
  );
}
