"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";
import { getMainAppAreaIdFromPathname, type MainAppAreaId } from "@/lib/main-app-areas";
import { sincronizarComprobantesProveedorDesdeDuxAction } from "@/actions/comprobantesProveedor";
import AppModal from "@/components/shared/AppModal";
import DuxSyncStyleButton from "@/components/shared/DuxSyncStyleButton";
import MensajeProceso from "@/components/shared/MensajeProceso";
import { useSyncComprasProveedorDuxStatusPoll } from "@/hooks/useSyncComprasProveedorDuxStatusPoll";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const POLL_INTERVAL_MS = 1500;

const SYNC_LABELS: Record<
  MainAppAreaId,
  { lineIdle: string; lineHover: string; ariaLabel: string }
> = {
  "gestion-productos": {
    lineIdle: "SINCRONIZACION PROD.",
    lineHover: "SINCRONIZAR PROD.",
    ariaLabel: "Iniciar Sincronización De Productos Desde DUX",
  },
  finanzas: {
    lineIdle: "SINCRONIZACION COMPRAS",
    lineHover: "SINCRONIZAR COMPRAS",
    ariaLabel: "Iniciar Sincronización De Compras Desde DUX",
  },
  "estadisticas-productos": {
    lineIdle: "SINCRONIZACION PROD.",
    lineHover: "SINCRONIZAR PROD.",
    ariaLabel: "Iniciar Sincronización De Productos Desde DUX",
  },
};

export default function SyncStatusIndicator() {
  const pathname = usePathname();
  const areaId = getMainAppAreaIdFromPathname(pathname);
  const labels = SYNC_LABELS[areaId];

  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [lastComprasOkAt, setLastComprasOkAt] = useState<string | null>(null);
  const [requestingStart, setRequestingStart] = useState(false);
  const [comprasSyncing, setComprasSyncing] = useState(false);
  const [cancelSyncModalOpen, setCancelSyncModalOpen] = useState(false);
  const [cancelSyncPending, setCancelSyncPending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const comprasProgreso = useSyncComprasProveedorDuxStatusPoll(comprasSyncing);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/sync-lista-precios-tienda/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setRunning(!!data.running);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
          setLastCompletedAt(data.lastCompletedAt ?? null);
        })
        .catch(() => {});
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleStartSync() {
    if (running || requestingStart || comprasSyncing) return;

    if (areaId === "finanzas") {
      setComprasSyncing(true);
      try {
        const res = await sincronizarComprobantesProveedorDesdeDuxAction();
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo sincronizar compras.");
          return;
        }
        setLastComprasOkAt(new Date().toISOString());
        const purga =
          res.data.eliminadosAntiguos > 0
            ? ` Eliminadas ${res.data.eliminadosAntiguos} con más de 150 días.`
            : "";
        const conError = res.data.detalleSucursal.filter((s) => s.error);
        if (conError.length > 0) {
          toast.warning(
            `Comprobantes actualizados: ${res.data.upserts} filas.${purga} Algunas sucursales respondieron con error en DUX.`
          );
        } else {
          toast.success(`Comprobantes actualizados: ${res.data.upserts} filas.${purga}`);
        }
      } finally {
        setComprasSyncing(false);
      }
      return;
    }

    setRequestingStart(true);
    try {
      await fetch("/api/sync-lista-precios-tienda", { method: "POST" });
    } catch {
      // El polling reflejará el estado real.
    } finally {
      setRequestingStart(false);
    }
  }

  async function confirmCancelListaPrecioSync() {
    setCancelSyncPending(true);
    try {
      const res = await fetch("/api/sync-lista-precios-tienda/cancel", { method: "POST" });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (!res.ok || !data?.ok) {
        toast.error("No se pudo cancelar la sincronización.");
        return;
      }
      if (data.cancelled) {
        toast.success("Sincronización cancelada.");
      } else {
        toast.info("No había sincronización en curso.");
      }
      setCancelSyncModalOpen(false);
    } catch {
      toast.error("No se pudo cancelar la sincronización.");
    } finally {
      setCancelSyncPending(false);
    }
  }

  const lastCompletedLabel = formatLastCompletedAtElapsed(lastCompletedAt);
  const lastComprasLabel = formatLastCompletedAtElapsed(lastComprasOkAt);
  const ultimaActLabel =
    areaId === "finanzas" ? (lastComprasLabel ?? "—") : (lastCompletedLabel ?? "—");

  if (running) {
    return (
      <>
        <MensajeProceso
          variant="sidebar"
          mensaje="SINCRONIZANDO PROD."
          detalle={total > 0 ? { procesados: processed, total } : "…"}
          onDoubleClick={() => setCancelSyncModalOpen(true)}
        />
        <Dialog
          open={cancelSyncModalOpen}
          onOpenChange={(open) => {
            if (!open && cancelSyncPending) return;
            setCancelSyncModalOpen(open);
          }}
        >
          <AppModal
            title="Cancelar Sincronización"
            size="sm"
            padding="sm"
            scrollBody={false}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cancelSyncPending}
                  onClick={() => setCancelSyncModalOpen(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  disabled={cancelSyncPending}
                  onClick={() => void confirmCancelListaPrecioSync()}
                >
                  Sí, Cancelar
                </Button>
              </>
            }
          >
            <p className="text-sm text-foreground">
              ¿Está seguro que desea cancelar la sincronización?
            </p>
          </AppModal>
        </Dialog>
      </>
    );
  }

  if (comprasSyncing) {
    return (
      <MensajeProceso
        variant="sidebar"
        mensaje="SINCRONIZANDO COMPRAS"
        detalle={
          comprasProgreso.total > 0
            ? { procesados: comprasProgreso.processed, total: comprasProgreso.total }
            : "…"
        }
      />
    );
  }

  return (
    <DuxSyncStyleButton
      lineIdle={labels.lineIdle}
      lineHover={labels.lineHover}
      secondary={requestingStart ? "…" : `Últ. Act.: ${ultimaActLabel}`}
      aria-label={labels.ariaLabel}
      onClick={handleStartSync}
      disabled={requestingStart}
      busy={requestingStart}
      surface="sidebar"
    />
  );
}
