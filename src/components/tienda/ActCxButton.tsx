"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  consultarEstadoCostoCxDuxAction,
  enviarCostoCxDuxAction,
} from "@/actions/cxPxTienda";
import { exportarResumenAumentosPxAction } from "@/actions/pxListas";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";

/** Intervalo mínimo DUX entre consultas de estado (cliente). */
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 36;

type ExitoActualizacion = {
  cantidadEnviada: number;
  lotes: number;
  idProcesoUltimo: number | null;
  advertencias: string[];
};

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ActCxButton() {
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [modalSinProductos, setModalSinProductos] = useState(false);
  const [exitoOpen, setExitoOpen] = useState(false);
  const [exitoData, setExitoData] = useState<ExitoActualizacion | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  async function esperarProcesoEnCliente(
    idProceso: number
  ): Promise<{ ok: true; advertencias: string[] } | { ok: false; error: string }> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      if (i > 0) {
        await sleepMs(POLL_INTERVAL_MS);
      }

      const res = await consultarEstadoCostoCxDuxAction({ idProceso });
      if (!res.ok) {
        return { ok: false, error: res.error ?? "No se pudo consultar el estado en DUX." };
      }

      setProgreso(
        res.data.finalizado
          ? "Proceso DUX finalizado."
          : `Esperando DUX (proceso ${idProceso}${res.data.estado ? ` — ${res.data.estado}` : ""})…`
      );

      if (res.data.finalizado) {
        return { ok: true, advertencias: res.data.errores };
      }
    }

    return {
      ok: false,
      error: `El proceso DUX ${idProceso} no finalizó a tiempo. Revisá en DUX o reintentá más tarde.`,
    };
  }

  async function handleActCx() {
    setProcesando(true);
    setProgreso("Enviando costos a DUX…");
    try {
      const envio = await enviarCostoCxDuxAction();
      if (!envio.ok) {
        if (envio.error?.includes("No hay productos")) {
          setModalSinProductos(true);
          return;
        }
        toast.error(envio.error ?? "No se pudo enviar a DUX.");
        return;
      }

      const advertencias: string[] = [];
      let idProcesoUltimo: number | null = null;

      for (let i = 0; i < envio.data.idsProceso.length; i++) {
        const idProceso = envio.data.idsProceso[i];
        idProcesoUltimo = idProceso;
        if (envio.data.idsProceso.length > 1) {
          setProgreso(`Esperando lote ${i + 1} de ${envio.data.idsProceso.length}…`);
        }

        const poll = await esperarProcesoEnCliente(idProceso);
        if (!poll.ok) {
          toast.error(poll.error);
          return;
        }
        advertencias.push(...poll.advertencias);
      }

      setExitoData({
        cantidadEnviada: envio.data.cantidadEnviada,
        lotes: envio.data.lotes,
        idProcesoUltimo,
        advertencias,
      });
      setExitoOpen(true);
      toast.success(`${envio.data.cantidadEnviada} costo(s) actualizado(s) en DUX.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error inesperado al actualizar costos en DUX."
      );
    } finally {
      setProcesando(false);
      setProgreso(null);
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
          {exitoData != null && exitoData.advertencias.length > 0 ? (
            <p className="mt-2 text-xs text-destructive">
              DUX reportó advertencias: {exitoData.advertencias.slice(0, 3).join(" · ")}
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
            {procesando ? (progreso ?? "Actualizando...") : "Act. Cx."}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          POST DUX: actualiza costos donde `costo_compra` difiere de
          `px_compra_final_sin_iva` del proveedor BASE (`costo_compra_cod_ext`).
          Tras el éxito, opción de descargar el PDF Resumen de Aumentos
        </TooltipContent>
      </Tooltip>
    </>
  );
}
