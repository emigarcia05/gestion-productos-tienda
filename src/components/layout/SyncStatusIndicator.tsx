"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";
import { getMainAppAreaIdFromPathname, type MainAppAreaId } from "@/lib/main-app-areas";
import { sincronizarComprobantesProveedorDesdeDuxAction } from "@/actions/comprobantesProveedor";
import { liberarActCxDuxTrabadoAction } from "@/actions/cxPxTienda";
import AppModal from "@/components/shared/AppModal";
import DuxSyncStyleButton from "@/components/shared/DuxSyncStyleButton";
import MensajeProceso from "@/components/shared/MensajeProceso";
import { useActCxDuxStatusPoll } from "@/hooks/useActCxDuxStatusPoll";
import { useSyncComprasProveedorDuxStatusPoll } from "@/hooks/useSyncComprasProveedorDuxStatusPoll";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
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

export default function SyncStatusIndicator({ rol }: Props) {
  const pathname = usePathname();
  const areaId = getMainAppAreaIdFromPathname(pathname);
  const labels = SYNC_LABELS[areaId];
  const actCxPollEnabled = areaId !== "finanzas";
  const puedeLiberarActCx = puede(rol, PERMISOS.cxPxTienda.acceso);
  const actCxStatus = useActCxDuxStatusPoll(actCxPollEnabled);

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
  const [liberarActCxModalOpen, setLiberarActCxModalOpen] = useState(false);
  const [liberarActCxPending, setLiberarActCxPending] = useState(false);
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
    if (actCxStatus.running) return;
    if (!running || requestingStart || syncStepsRunningRef.current) return;
    void runSyncStepsUntilDone();
  }, [running, requestingStart, areaId, actCxStatus.running]);

  async function confirmLiberarActCxBloqueo() {
    setLiberarActCxPending(true);
    try {
      const res = await liberarActCxDuxTrabadoAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo liberar el bloqueo.");
        return;
      }
      toast.success("Bloqueo Act. Cx. liberado. Podés reintentar.");
      setLiberarActCxModalOpen(false);
    } catch {
      toast.error("No se pudo liberar el bloqueo.");
    } finally {
      setLiberarActCxPending(false);
    }
  }

  async function handleStartSync() {
    if (running || requestingStart || comprasSyncing || actCxStatus.running) {
      if (actCxStatus.running) {
        toast.error("Hay una actualización de costos DUX en curso. Esperá a que finalice.");
      }
      return;
    }

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

  const actCxMensaje =
    actCxStatus.phase === "enviando" ? "ENVIANDO COSTOS DUX" : "ACTUALIZANDO COSTOS DUX";

  if (actCxStatus.running) {
    return (
      <>
        <MensajeProceso
          variant="sidebar"
          mensaje={actCxMensaje}
          detalle={
            actCxStatus.total > 0
              ? { procesados: actCxStatus.processed, total: actCxStatus.total }
              : "…"
          }
          onDoubleClick={
            puedeLiberarActCx ? () => setLiberarActCxModalOpen(true) : undefined
          }
          doubleClickTitle="Doble Clic Para Liberar Bloqueo Act. Cx."
        />
        {puedeLiberarActCx ? (
          <Dialog
            open={liberarActCxModalOpen}
            onOpenChange={(open) => {
              if (!open && liberarActCxPending) return;
              setLiberarActCxModalOpen(open);
            }}
          >
            <AppModal
              title="Liberar Bloqueo Act. Cx."
              size="sm"
              padding="sm"
              scrollBody={false}
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={liberarActCxPending}
                    onClick={() => setLiberarActCxModalOpen(false)}
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    disabled={liberarActCxPending}
                    onClick={() => void confirmLiberarActCxBloqueo()}
                  >
                    Sí, Liberar
                  </Button>
                </>
              }
            >
              <p className="text-sm text-foreground">
                ¿Liberar el bloqueo de actualización de costos DUX? Usalo solo si el
                proceso quedó trabado. Si DUX sigue procesando en segundo plano,
                revisá allí antes de reenviar.
              </p>
            </AppModal>
          </Dialog>
        ) : null}
      </>
    );
  }

  if (running) {
    return (
      <>
        <MensajeProceso
          variant="sidebar"
          mensaje={phase === "guardando" ? "GUARDANDO PROD." : "SINCRONIZANDO PROD."}
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
      disabled={requestingStart || actCxStatus.running}
      busy={requestingStart}
      surface="sidebar"
    />
  );
}
