"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportarPxListasMargenAction } from "@/actions/pxListasPrecios";
import { descargarExcelsPxListasMargen } from "@/lib/exportPxListasMargenExcelClient";
import { DUX_NUEVO_IMPORTADOR_URL } from "@/lib/duxImportador";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";

export default function ActPxListasButton() {
  const router = useRouter();
  const [exportando, setExportando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);

  async function handleExportar() {
    window.open(DUX_NUEVO_IMPORTADOR_URL, "_blank", "noopener,noreferrer");
    setExportando(true);
    try {
      const res = await exportarPxListasMargenAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar las listas de precios.");
        return;
      }

      const gruposConFilas = res.data.grupos.filter((g) => g.filas.length > 0);
      if (gruposConFilas.length === 0) {
        setModalSinProductos(true);
        return;
      }

      const nArchivos = descargarExcelsPxListasMargen(gruposConFilas);
      const totalFilas = gruposConFilas.reduce((acc, g) => acc + g.filas.length, 0);
      toast.success(
        nArchivos === 1
          ? `Excel exportado: 1 lista (${totalFilas.toLocaleString("es-AR")} ítems). Actualización pendiente cerrada.`
          : `Excel exportado: ${nArchivos} listas (${totalFilas.toLocaleString("es-AR")} ítems en total). Actualización pendiente cerrada.`
      );
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error inesperado al exportar listas."
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
            <Upload className="h-4 w-4 shrink-0" />
            {exportando ? "Exportando..." : "Act. Px."}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Exporta un Excel por lista DUX (CODIGO + PORC UTILIDAD) con márgenes
          pendientes, cierra la actualización en curso y abre el importador DUX
        </TooltipContent>
      </Tooltip>
    </>
  );
}
