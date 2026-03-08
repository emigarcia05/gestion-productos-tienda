"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import MensajeProceso from "@/components/shared/MensajeProceso";
import { useImportResult } from "@/components/import/ImportResultContext";

const POLL_INTERVAL_MS = 1000;

export default function ImportStatusIndicator() {
  const { openResult, openError } = useImportResult();
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ creados: number; actualizados: number; eliminados?: number; errores: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastDoneRef = useRef(false);
  const hadRunningThisSessionRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/import-lista-precios/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.running) {
            hadRunningThisSessionRef.current = true;
            lastDoneRef.current = false;
          }
          setRunning(!!data.running);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
          setDone(!!data.done);
          setResult(data.result ?? null);
          setError(data.error ?? null);
        })
        .catch(() => {});
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Solo abrir modal cuando en esta sesión vimos la importación en curso y luego terminó (evita abrir al navegar con estado "done" persistido)
  useEffect(() => {
    if (!done || lastDoneRef.current || !hadRunningThisSessionRef.current) return;
    lastDoneRef.current = true;
    hadRunningThisSessionRef.current = false;
    if (error) {
      toast.error(error);
      openError(error);
    } else if (result) {
      openResult({
        creados: result.creados,
        actualizados: result.actualizados,
        eliminados: result.eliminados ?? 0,
        errores: result.errores ?? [],
      });
    }
  }, [done, error, result, openResult, openError]);

  if (!running) return null;

  return (
    <MensajeProceso
      variant="sidebar"
      mensaje="Importando!"
      detalle={total > 0 ? { procesados: processed, total } : "…"}
    />
  );
}
