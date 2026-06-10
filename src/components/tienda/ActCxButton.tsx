"use client";

import { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  abortarActCxDuxAction,
  iniciarActCxDuxAction,
} from "@/actions/cxPxTienda";
import { exportarResumenAumentosPxAction } from "@/actions/pxListas";
import { descargarPdfResumenAumentosPx } from "@/lib/exportPxPdfClient";
import ModalSinProductosExportar from "@/components/tienda/ModalSinProductosExportar";
import { triggerActCxDuxRunner } from "@/lib/actCxDuxRunner";
import { setActCxClientPending } from "@/hooks/useActCxClientPending";
import { useActCxDuxStatusPoll } from "@/hooks/useActCxDuxStatusPoll";
import { useSyncListaPreciosStatusPoll } from "@/hooks/useSyncListaPreciosStatusPoll";

interface Props {
  pollEnabled: boolean;
}

export default function ActCxButton({ pollEnabled }: Props) {
  const actCxStatus = useActCxDuxStatusPoll(pollEnabled);
  const syncListaStatus = useSyncListaPreciosStatusPoll(pollEnabled);
  const [procesandoLocal, setProcesandoLocal] = useState(false);
  const [modalSinProductos, setModalSinProductos] = useState(false);
  const [exitoOpen, setExitoOpen] = useState(false);
  const [cantidadActualizada, setCantidadActualizada] = useState(0);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const prevRunningRef = useRef(false);
  const prevCompletedAtRef = useRef<string | null>(null);

  const bloqueadoPorSync = syncListaStatus.running;
  const bloqueadoPorOtro = actCxStatus.running && !procesandoLocal;
  const procesando = procesandoLocal || actCxStatus.running;

  useEffect(() => {
    const wasRunning = prevRunningRef.current;
    const completedAt = actCxStatus.lastCompletedAt;

    if (
      wasRunning &&
      !actCxStatus.running &&
      !actCxStatus.error &&
      completedAt &&
      completedAt !== prevCompletedAtRef.current &&
      actCxStatus.total > 0
    ) {
      setCantidadActualizada(actCxStatus.total);
      setExitoOpen(true);
    }

    prevRunningRef.current = actCxStatus.running;
    if (completedAt != null) {
      prevCompletedAtRef.current = completedAt;
    }
  }, [actCxStatus]);

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

      triggerActCxDuxRunner();
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
