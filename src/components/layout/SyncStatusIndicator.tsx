"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";
import { sincronizarComprobantesProveedorDesdeDuxAction } from "@/actions/comprobantesProveedor";
import DuxSyncStyleButton from "@/components/shared/DuxSyncStyleButton";
import SincronizarDuxOpcionesModal, {
  type SincronizarDuxOpcion,
} from "@/components/layout/SincronizarDuxOpcionesModal";
import { useSyncComprasProveedorDuxStatusPoll } from "@/hooks/useSyncComprasProveedorDuxStatusPoll";
import type { Rol } from "@/lib/permisos";

const POLL_INTERVAL_MS = 1500;
const SYNC_LABEL = "SINCRONIZAR";

interface Props {
  rol: Rol;
}

function isoMasReciente(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

export default function SyncStatusIndicator({ rol }: Props) {
  const esEditor = rol === "editor";

  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [requestingStart, setRequestingStart] = useState(false);
  const [comprasSyncingLocal, setComprasSyncingLocal] = useState(false);
  const [opcionesModalOpen, setOpcionesModalOpen] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRunningRef = useRef(false);
  const prevLastCompletedAtRef = useRef<string | null>(null);
  const syncStepsRunningRef = useRef(false);

  const comprasEstado = useSyncComprasProveedorDuxStatusPoll(esEditor);

  const comprasRunning = comprasEstado.running || comprasSyncingLocal;
  const syncEnCurso = running || requestingStart || comprasRunning;

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
                  ? `Sincronización de productos finalizada: ${proc.toLocaleString("es-AR")} de ${tot.toLocaleString("es-AR")}.`
                  : "Sincronización de productos finalizada."
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
    if (!running || requestingStart || syncStepsRunningRef.current) return;
    void runSyncStepsUntilDone();
  }, [running, requestingStart]);

  async function iniciarSyncProductos() {
    if (syncEnCurso) return;
    setRequestingStart(true);
    try {
      await runSyncStepsUntilDone();
    } finally {
      setRequestingStart(false);
    }
  }

  async function iniciarSyncCompras() {
    if (syncEnCurso) return;
    setComprasSyncingLocal(true);
    try {
      const res = await sincronizarComprobantesProveedorDesdeDuxAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo sincronizar compras.");
        return;
      }
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
      setComprasSyncingLocal(false);
    }
  }

  function handleClickSincronizar() {
    if (syncEnCurso) return;
    if (esEditor) {
      setOpcionesModalOpen(true);
      return;
    }
    void iniciarSyncProductos();
  }

  async function handleElegirOpcion(opcion: SincronizarDuxOpcion) {
    setOpcionesModalOpen(false);
    if (opcion === "productos") {
      await iniciarSyncProductos();
      return;
    }
    await iniciarSyncCompras();
  }

  const ultimaActIso = useMemo(
    () => isoMasReciente(lastCompletedAt, comprasEstado.lastCompletedAt),
    [lastCompletedAt, comprasEstado.lastCompletedAt]
  );
  const ultimaActLabel = formatLastCompletedAtElapsed(ultimaActIso) ?? "—";

  return (
    <>
      <DuxSyncStyleButton
        lineIdle={SYNC_LABEL}
        lineHover={SYNC_LABEL}
        secondary={`Últ. Act.: ${ultimaActLabel}`}
        aria-label="Sincronizar datos desde DUX"
        onClick={handleClickSincronizar}
        disabled={syncEnCurso}
        busy={syncEnCurso}
        surface="sidebar"
        title={
          syncEnCurso
            ? running
              ? `Sincronizando productos${total > 0 ? ` (${processed.toLocaleString("es-AR")} de ${total.toLocaleString("es-AR")})` : ""}`
              : comprasRunning
                ? "Sincronizando compras"
                : "Sincronización en curso"
            : undefined
        }
      />
      {esEditor ? (
        <SincronizarDuxOpcionesModal
          open={opcionesModalOpen}
          onOpenChange={setOpcionesModalOpen}
          onElegir={(opcion) => void handleElegirOpcion(opcion)}
          disabled={syncEnCurso}
        />
      ) : null}
    </>
  );
}
