"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarResumenAumentosPxAction } from "@/actions/pxListas";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";

export default function ExportarResumenAumentosButton() {
  const [exportando, setExportando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await exportarResumenAumentosPxAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar el resumen.");
        return;
      }
      if (res.data.resumenAumentos.marcas.length === 0) {
        setModalSinProductos(true);
        return;
      }
      await descargarPdfResumenAumentosPx(res.data.resumenAumentos);
      toast.success("Resumen de aumentos exportado en PDF.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo descargar el PDF de aumentos."
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
            variant="outline"
            size="default"
            className="gap-2 shrink-0"
            disabled={exportando}
            onClick={() => void handleExportar()}
          >
            <FileText className="h-4 w-4 shrink-0" />
            {exportando ? "Exportando..." : "Exportar Resumen Aumentos"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          PDF con aumentos promedio por marca y rubro (solo precios de venta modificados vs
          DUX)
        </TooltipContent>
      </Tooltip>
    </>
  );
}
