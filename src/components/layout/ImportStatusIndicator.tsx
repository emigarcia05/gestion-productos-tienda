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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/import-lista-precios/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
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

  // Al terminar: abrir modal de resultado y opcionalmente toast de error
  useEffect(() => {
    if (!done || lastDoneRef.current) return;
    lastDoneRef.current = true;
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

  useEffect(() => {
    if (!running) lastDoneRef.current = false;
  }, [running]);

  if (!running) return null;

  return (
    <MensajeProceso
      variant="sidebar"
      mensaje="Importando!"
      detalle={total > 0 ? { procesados: processed, total } : "…"}
    />
  );
}
