"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  abortarActCxDuxAction,
  comenzarConfirmacionActCxDuxAction,
  consultarEstadoCostoCxDuxAction,
  enviarLoteCostoCxDuxAction,
  finalizarActCxDuxExitoAction,
  iniciarActCxDuxAction,
} from "@/actions/cxPxTienda";
import { exportarResumenAumentosPxAction } from "@/actions/pxListas";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";
import { setActCxClientPending } from "@/hooks/useActCxClientPending";
import { useActCxDuxStatusPoll } from "@/hooks/useActCxDuxStatusPoll";
import { useSyncListaPreciosStatusPoll } from "@/hooks/useSyncListaPreciosStatusPoll";

/** Intervalo mínimo DUX entre consultas de estado (cliente). */
const POLL_INTERVAL_MS = 5000;
/** ~10 min por lote (DUX puede demorar en procesar 50 ítems). */
const POLL_MAX_ATTEMPTS = 120;

interface Props {
  pollEnabled: boolean;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ActCxButton({ pollEnabled }: Props) {
  const actCxStatus = useActCxDuxStatusPoll(pollEnabled);
  const syncListaStatus = useSyncListaPreciosStatusPoll(pollEnabled);
  const [procesandoLocal, setProcesandoLocal] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);
  const [exitoOpen, setExitoOpen] = useState(false);
  const [cantidadActualizada, setCantidadActualizada] = useState(0);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const bloqueadoPorSync = syncListaStatus.running;
  const bloqueadoPorOtro =
    actCxStatus.running && !procesandoLocal;
  const procesando = procesandoLocal || actCxStatus.running;

  async function esperarProcesoEnCliente(
    idProceso: number,
    itemsCompletadosAntes: number,
    itemsEnLote: number,
    loteActual: number,
    lotesTotal: number
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      if (i > 0) {
        await sleepMs(POLL_INTERVAL_MS);
      }

      const res = await consultarEstadoCostoCxDuxAction({
        idProceso,
        itemsCompletadosAntes,
        itemsEnLote,
        loteActual,
        lotesTotal,
      });
      if (!res.ok) {
        return { ok: false, error: res.error ?? "No se pudo consultar el estado en DUX." };
      }

      if (res.data.finalizado) {
        return { ok: true };
      }
    }

    return {
      ok: false,
      error: `El proceso DUX ${idProceso} no finalizó a tiempo. Revisá en DUX o reintentá más tarde.`,
    };
  }

  async function handleActCx() {
    if (bloqueadoPorSync) {
      toast.error("Hay una sincronización de productos DUX en curso. Esperá a que finalice.");
      return;
    }
    if (bloqueadoPorOtro) {
      toast.error("Ya hay una actualización de costos DUX en curso.");
      return;
    }

    setProcesandoLocal(true);
    setActCxClientPending(true);
    try {
      const inicio = await iniciarActCxDuxAction();
      if (!inicio.ok) {
        if (inicio.error?.includes("No hay productos")) {
          setModalSinProductos(true);
          return;
        }
        toast.error(inicio.error ?? "No se pudo iniciar la actualización en DUX.");
        return;
      }

      const lotesEnviados: Array<{
        idProceso: number;
        itemsCompletadosAntes: number;
        itemsEnLote: number;
        loteIndex: number;
      }> = [];

      for (let loteIndex = 0; loteIndex < inicio.data.lotes; loteIndex++) {
        const lote = await enviarLoteCostoCxDuxAction({ loteIndex });
        if (!lote.ok) {
          if (!lote.error?.includes("No hay una actualización")) {
            await abortarActCxDuxAction({
              error: lote.error ?? "No se pudo enviar un lote a DUX.",
            });
          }
          toast.error(lote.error ?? "No se pudo enviar un lote a DUX.");
          return;
        }

        lotesEnviados.push({
          idProceso: lote.data.idProceso,
          itemsCompletadosAntes: lote.data.itemsCompletadosAntes,
          itemsEnLote: lote.data.itemsEnLote,
          loteIndex: lote.data.loteIndex,
        });
      }

      const confirmacion = await comenzarConfirmacionActCxDuxAction();
      if (!confirmacion.ok) {
        toast.error(confirmacion.error ?? "No se pudo iniciar la confirmación en DUX.");
        return;
      }

      for (const lote of lotesEnviados) {
        const poll = await esperarProcesoEnCliente(
          lote.idProceso,
          lote.itemsCompletadosAntes,
          lote.itemsEnLote,
          lote.loteIndex + 1,
          inicio.data.lotes
        );
        if (!poll.ok) {
          await abortarActCxDuxAction({ error: poll.error });
          toast.error(poll.error);
          return;
        }
      }

      const fin = await finalizarActCxDuxExitoAction({
        cantidadEnviada: inicio.data.cantidadEnviada,
      });
      if (!fin.ok) {
        await abortarActCxDuxAction({
          error: fin.error ?? "No se pudo cerrar la actualización.",
        });
        toast.error(fin.error ?? "No se pudo cerrar la actualización.");
        return;
      }

      setCantidadActualizada(inicio.data.cantidadEnviada);
      setExitoOpen(true);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Error inesperado al actualizar costos en DUX.";
      await abortarActCxDuxAction({ error: msg });
      toast.error(msg);
    } finally {
      setActCxClientPending(false);
      setProcesandoLocal(false);
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
      setCantidadActualizada(0);
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
    setCantidadActualizada(0);
  }

  const labelItems =
    cantidadActualizada === 1 ? "1 ítem" : `${cantidadActualizada} ítems`;

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
          title="Actualización Completada"
          size="sm"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                disabled={descargandoPdf}
                onClick={cerrarExitoModal}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                disabled={descargandoPdf}
                onClick={() => void handleDescargarResumenAumentos()}
              >
                {descargandoPdf
                  ? "Descargando..."
                  : "Descargar PDF Resumen de Aumentos"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-foreground">
            Se actualizaron {labelItems}.
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
            disabled={procesando || exitoOpen || bloqueadoPorOtro || bloqueadoPorSync}
            onClick={() => void handleActCx()}
          >
            <Upload className="h-4 w-4 shrink-0" />
            Act. Cx.
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          POST DUX: actualiza costos con diferencia respecto al proveedor BASE.
          Mientras corre, se bloquean otras consultas DUX conflictivas
        </TooltipContent>
      </Tooltip>
    </>
  );
}
