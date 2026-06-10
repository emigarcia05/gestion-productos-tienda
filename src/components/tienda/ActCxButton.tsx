"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarCostoCxDiffAction } from "@/actions/cxPxTienda";
import { exportarResumenAumentosPxAction } from "@/actions/pxListas";
import { descargarExcelCostoCx } from "@/lib/exportCostoCxExcelClient";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";
import ModalExportarInformeAumento from "@/components/tienda/ModalExportarInformeAumento";

export default function ActCxButton() {
  const [exportando, setExportando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);
  const [modalInformeAumento, setModalInformeAumento] = useState(false);

  async function handleExportarInformeAumento() {
    const res = await exportarResumenAumentosPxAction();
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo generar el informe de aumentos.");
      return;
    }
    await descargarPdfResumenAumentosPx(res.data.informeAumentos);
    toast.success("Informe de aumentos exportado.");
  }

  async function handleActCx() {
    setExportando(true);
    try {
      const res = await exportarCostoCxDiffAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar el Excel de costos.");
        return;
      }
      if (res.data.filas.length === 0) {
        setModalSinProductos(true);
        return;
      }
      descargarExcelCostoCx(res.data.filas);
      const n = res.data.filas.length;
      toast.success(
        n === 1
          ? "Excel exportado: 1 ítem con diferencia de costo."
          : `Excel exportado: ${n.toLocaleString("es-AR")} ítems con diferencia de costo.`
      );
      setModalInformeAumento(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error inesperado al exportar costos."
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
      <ModalExportarInformeAumento
        open={modalInformeAumento}
        onOpenChange={setModalInformeAumento}
        onConfirmExport={handleExportarInformeAumento}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="default"
            size="default"
            className="btn-primario-gestion gap-2 shrink-0"
            disabled={exportando}
            onClick={() => void handleActCx()}
          >
            <Upload className="h-4 w-4 shrink-0" />
            {exportando ? "Exportando..." : "Act. Cx."}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Exporta Excel (CODIGO + COSTO) con diferencias respecto al proveedor BASE
          para importar en DUX
        </TooltipContent>
      </Tooltip>
    </>
  );
}
