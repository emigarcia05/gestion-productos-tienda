"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";
import { getMainAppAreaIdFromPathname, type MainAppAreaId } from "@/lib/main-app-areas";
import { sincronizarComprobantesProveedorDesdeDuxAction } from "@/actions/comprobantesProveedor";
import AppModal from "@/components/shared/AppModal";
import DuxSyncStyleButton, {
  type DuxSyncProgresoDetalle,
} from "@/components/shared/DuxSyncStyleButton";
import { useSyncComprasProveedorDuxStatusPoll } from "@/hooks/useSyncComprasProveedorDuxStatusPoll";
import type { Rol } from "@/lib/permisos";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const POLL_INTERVAL_MS = 1500;

type SyncListaPreciosPhase = "sincronizando" | "guardando";

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

interface Props {
  rol: Rol;
}

export default function SyncStatusIndicator({ rol: _rol }: Props) {
  const pathname = usePathname();
  const areaId = getMainAppAreaIdFromPathname(pathname);
  const labels = SYNC_LABELS[areaId];

  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [lastComprasOkAt, setLastComprasOkAt] = useState<string | null>(null);
  const [phase, setPhase] = useState<SyncListaPreciosPhase | null>(null);
  const [requestingStart, setRequestingStart] = useState(false);
  const [comprasSyncing, setComprasSyncing] = useState(false);
  const [cancelSyncModalOpen, setCancelSyncModalOpen] = useState(false);
  const [cancelSyncPending, setCancelSyncPending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRunningRef = useRef(false);
  const prevLastCompletedAtRef = useRef<string | null>(null);
  const syncStepsRunningRef = useRef(false);

  const comprasProgreso = useSyncComprasProveedorDuxStatusPoll(comprasSyncing);

  async function runSyncStepsUntilDone() {
    if (syncStepsRunningRef.current) return;
    syncStepsRunningRef.current = true;
    try {
      let continuing = true;
      while (continuing) {
        const res = await fetch("/api/sync-lista-precios-tienda", { method: "POST" });
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (!res.ok || !data?.ok) {
          if (data?.error && !data?.cancelled) {
            toast.error(String(data.error));
          }
          break;
        }
        continuing = !!data.continuing;
      }
    } catch {
      toast.error("Error de red durante la sincronización.");
    } finally {
      syncStepsRunningRef.current = false;
    }
  }

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/sync-lista-precios-tienda/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;

          const nowRunning = !!data.running;
          const completedAt = data.lastCompletedAt ?? null;

          if (prevRunningRef.current && !nowRunning) {
            if (data.error) {
              toast.error(String(data.error));
            } else if (
              completedAt &&
              completedAt !== prevLastCompletedAtRef.current
            ) {
              const proc = Number(data.processed ?? 0);
              const tot = Number(data.total ?? 0);
              toast.success(
                tot > 0
                  ? `Sincronización finalizada: ${proc.toLocaleString("es-AR")} de ${tot.toLocaleString("es-AR")} productos.`
                  : "Sincronización finalizada."
              );
            }
          }

          prevRunningRef.current = nowRunning;
          if (completedAt != null) {
            prevLastCompletedAtRef.current = completedAt;
          }

          setRunning(nowRunning);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
          setLastCompletedAt(completedAt);
          setPhase(
            data.phase === "guardando" || data.phase === "sincronizando"
              ? data.phase
              : null
          );
        })
        .catch(() => {});
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (areaId === "finanzas") return;
    if (!running || requestingStart || syncStepsRunningRef.current) return;
    void runSyncStepsUntilDone();
  }, [running, requestingStart, areaId]);

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
      await runSyncStepsUntilDone();
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

  let sidebarProgreso:
    | { mensaje: string; detalle?: DuxSyncProgresoDetalle }
    | undefined;
  let onProgresoDoubleClick: (() => void) | undefined;
  let progresoDoubleClickTitle: string | undefined;

  if (running) {
    sidebarProgreso = {
      mensaje: phase === "guardando" ? "GUARDANDO PROD." : "SINCRONIZANDO PROD.",
      detalle: total > 0 ? { procesados: processed, total } : "…",
    };
    onProgresoDoubleClick = () => setCancelSyncModalOpen(true);
    progresoDoubleClickTitle = "Doble Clic Para Cancelar Sincronización";
  } else if (comprasSyncing) {
    sidebarProgreso = {
      mensaje: "SINCRONIZANDO COMPRAS",
      detalle:
        comprasProgreso.total > 0
          ? { procesados: comprasProgreso.processed, total: comprasProgreso.total }
          : "…",
    };
  } else if (requestingStart) {
    sidebarProgreso = { mensaje: "INICIANDO SYNC. PROD.", detalle: "…" };
  }

  return (
    <>
      <DuxSyncStyleButton
        lineIdle={labels.lineIdle}
        lineHover={labels.lineHover}
        secondary={`Últ. Act.: ${ultimaActLabel}`}
        aria-label={labels.ariaLabel}
        onClick={handleStartSync}
        disabled={requestingStart || running || comprasSyncing}
        busy={requestingStart}
        surface="sidebar"
        progreso={sidebarProgreso}
        onProgresoDoubleClick={onProgresoDoubleClick}
        progresoDoubleClickTitle={progresoDoubleClickTitle}
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
