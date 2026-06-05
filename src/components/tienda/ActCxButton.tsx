"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  actualizarCostoCxDuxAction,
} from "@/actions/cxPxTienda";
import { exportarResumenAumentosPxAction } from "@/actions/pxListas";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";

type ExitoActualizacion = {
  cantidadEnviada: number;
  lotes: number;
  idProcesoUltimo: number | null;
};

export default function ActCxButton() {
  const [procesando, setProcesando] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);
  const [exitoOpen, setExitoOpen] = useState(false);
  const [exitoData, setExitoData] = useState<ExitoActualizacion | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  async function handleActCx() {
    setProcesando(true);
    try {
      const res = await actualizarCostoCxDuxAction();
      if (!res.ok) {
        if (res.error?.includes("No hay productos")) {
          setModalSinProductos(true);
          return;
        }
        toast.error(res.error ?? "No se pudo actualizar en DUX.");
        return;
      }

      setExitoData({
        cantidadEnviada: res.data.cantidadEnviada,
        lotes: res.data.lotes,
        idProcesoUltimo: res.data.idProcesoUltimo,
      });
      setExitoOpen(true);
    } finally {
      setProcesando(false);
    }
  }

  async function handleDescargarResumenAumentos() {
    setDescargandoPdf(true);
    try {
      const res = await exportarResumenAumentosPxAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo exportar el resumen.");
        return;
      }
      if (res.data.informeAumentos.resumen.marcas.length === 0) {
        setModalSinProductos(true);
        setExitoOpen(false);
        return;
      }
      await descargarPdfResumenAumentosPx(res.data.informeAumentos);
      toast.success("Resumen de aumentos exportado en PDF.");
      setExitoOpen(false);
      setExitoData(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo descargar el PDF de aumentos."
      );
    } finally {
      setDescargandoPdf(false);
    }
  }

  function cerrarExitoModal() {
    if (descargandoPdf) return;
    setExitoOpen(false);
    setExitoData(null);
  }

  const lotesTxt =
    exitoData != null && exitoData.lotes > 1
      ? ` en ${exitoData.lotes} lotes`
      : "";
  const procTxt =
    exitoData?.idProcesoUltimo != null
      ? ` (proceso DUX ${exitoData.idProcesoUltimo})`
      : "";

  return (
    <>
      <ModalSinProductosExportar
        open={modalSinProductos}
        onOpenChange={setModalSinProductos}
      />
      <Dialog
        open={exitoOpen}
        onOpenChange={(next) => {
          if (!next) cerrarExitoModal();
        }}
      >
        <AppModal
          title="Costos Actualizados"
          size="sm"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={descargandoPdf}
                onClick={cerrarExitoModal}
              >
                No
              </Button>
              <Button
                type="button"
                disabled={descargandoPdf}
                onClick={() => void handleDescargarResumenAumentos()}
              >
                {descargandoPdf ? "Descargando..." : "Si"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-foreground">
            Los costos se actualizaron correctamente en DUX.
          </p>
          {exitoData ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {exitoData.cantidadEnviada} costo(s) enviado(s)
              {lotesTxt}
              {procTxt}.
            </p>
          ) : null}
          <p className="mt-3 text-sm text-foreground">
            ¿Desea descargar El Resumen de Aumentos?
          </p>
        </AppModal>
      </Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="default"
            size="default"
            className="btn-primario-gestion gap-2 shrink-0"
            disabled={procesando || exitoOpen}
            onClick={() => void handleActCx()}
          >
            <Upload className="h-4 w-4 shrink-0" />
            {procesando ? "Actualizando..." : "Act. Cx."}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          POST DUX: actualiza costos donde CX PROD. difiere del costo DUX. Tras
          el éxito, opción de descargar el PDF Resumen de Aumentos
        </TooltipContent>
      </Tooltip>
    </>
  );
}
