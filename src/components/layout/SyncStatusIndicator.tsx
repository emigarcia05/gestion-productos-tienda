"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";
import { getMainAppAreaIdFromPathname, type MainAppAreaId } from "@/lib/main-app-areas";
import { sincronizarComprobantesProveedorDesdeDuxAction } from "@/actions/comprobantesProveedor";
import { liberarActCxDuxTrabadoAction, avanzarActCxDuxAction } from "@/actions/cxPxTienda";
import { ACT_CX_DUX_POLL_MAX_ATTEMPTS } from "@/lib/actCxDuxPollPolicy";
import { registerActCxDuxRunner } from "@/lib/actCxDuxRunner";
import AppModal from "@/components/shared/AppModal";
import DuxSyncStyleButton, {
  type DuxSyncProgresoDetalle,
} from "@/components/shared/DuxSyncStyleButton";
import { useActCxClientPending } from "@/hooks/useActCxClientPending";
import { useActCxDuxStatusPoll } from "@/hooks/useActCxDuxStatusPoll";
import { useSyncComprasProveedorDuxStatusPoll } from "@/hooks/useSyncComprasProveedorDuxStatusPoll";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const POLL_INTERVAL_MS = 1500;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const actCxClientPending = useActCxClientPending();
  const actCxVisible =
    actCxPollEnabled && (actCxClientPending || actCxStatus.running);

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
  const actCxStepsRunningRef = useRef(false);
  const runActCxStepsRef = useRef<() => Promise<void>>(async () => {});
  const prevActCxRunningRef = useRef(false);
  const prevActCxCompletedAtRef = useRef<string | null>(null);

  const comprasProgreso = useSyncComprasProveedorDuxStatusPoll(comprasSyncing);

  runActCxStepsRef.current = async function runActCxStepsUntilDone() {
    if (actCxStepsRunningRef.current) return;
    actCxStepsRunningRef.current = true;
    try {
      let continuing = true;
      while (continuing) {
        const res = await avanzarActCxDuxAction();
        if (!res.ok) {
          toast.error(
            res.error ?? "No se pudo avanzar la actualización de costos DUX."
          );
          break;
        }
        continuing = res.data.continuing;
        if (continuing && res.data.waitMs > 0) {
          await sleepMs(res.data.waitMs);
        }
      }
    } catch {
      toast.error("Error de red durante la actualización de costos DUX.");
    } finally {
      actCxStepsRunningRef.current = false;
    }
  };

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
    registerActCxDuxRunner(() => runActCxStepsRef.current());
    return () => registerActCxDuxRunner(null);
  }, []);

  useEffect(() => {
    if (areaId === "finanzas") return;
    if (!actCxStatus.running || actCxStepsRunningRef.current) return;
    void runActCxStepsRef.current();
  }, [actCxStatus.running, areaId]);

  useEffect(() => {
    if (areaId === "finanzas") return;

    const completedAt = actCxStatus.lastCompletedAt;
    if (
      prevActCxRunningRef.current &&
      !actCxStatus.running &&
      !actCxStatus.error &&
      completedAt &&
      completedAt !== prevActCxCompletedAtRef.current &&
      actCxStatus.total > 0
    ) {
      toast.success(
        `Costos actualizados en DUX: ${actCxStatus.total.toLocaleString("es-AR")} ítems.`
      );
    }

    prevActCxRunningRef.current = actCxStatus.running;
    if (completedAt != null) {
      prevActCxCompletedAtRef.current = completedAt;
    }
  }, [actCxStatus, areaId]);

  useEffect(() => {
    if (areaId === "finanzas") return;
    if (actCxVisible) return;
    if (!running || requestingStart || syncStepsRunningRef.current) return;
    void runSyncStepsUntilDone();
  }, [running, requestingStart, areaId, actCxVisible]);

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
    if (running || requestingStart || comprasSyncing || actCxVisible) {
      if (actCxVisible) {
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
    actCxStatus.phase === "enviando"
      ? "ENVIANDO COSTOS DUX"
      : "CONFIRMANDO COSTOS DUX";

  function buildActCxDetalle(): DuxSyncProgresoDetalle {
    const parts: string[] = [];
    if (actCxStatus.loteActual != null && actCxStatus.lotesTotal != null) {
      parts.push(`Lote ${actCxStatus.loteActual} de ${actCxStatus.lotesTotal}`);
    }
    if (actCxStatus.total > 0) {
      parts.push(
        `${actCxStatus.processed.toLocaleString("es-AR")} de ${actCxStatus.total.toLocaleString("es-AR")}`
      );
    }
    if (
      actCxStatus.phase === "esperando" &&
      actCxStatus.pollIntento != null &&
      actCxStatus.pollIntento > 0
    ) {
      parts.push(
        `Consulta ${actCxStatus.pollIntento}/${ACT_CX_DUX_POLL_MAX_ATTEMPTS}`
      );
    }
    if (actCxStatus.estadoDux) {
      parts.push(actCxStatus.estadoDux);
    }
    if (parts.length === 0) return "…";
    return parts.join(" · ");
  }

  let sidebarProgreso:
    | { mensaje: string; detalle?: DuxSyncProgresoDetalle }
    | undefined;
  let onProgresoDoubleClick: (() => void) | undefined;
  let progresoDoubleClickTitle: string | undefined;

  if (actCxVisible) {
    if (actCxClientPending && !actCxStatus.running) {
      sidebarProgreso = { mensaje: "INICIANDO ACT. CX.", detalle: "…" };
    } else {
      sidebarProgreso = {
        mensaje: actCxMensaje,
        detalle: buildActCxDetalle(),
      };
    }
    if (puedeLiberarActCx && actCxStatus.running) {
      onProgresoDoubleClick = () => setLiberarActCxModalOpen(true);
      progresoDoubleClickTitle = "Doble Clic Para Liberar Bloqueo Act. Cx.";
    }
  } else if (running) {
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
        disabled={requestingStart || actCxVisible || running || comprasSyncing}
        busy={requestingStart}
        surface="sidebar"
        progreso={sidebarProgreso}
        onProgresoDoubleClick={onProgresoDoubleClick}
        progresoDoubleClickTitle={progresoDoubleClickTitle}
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
