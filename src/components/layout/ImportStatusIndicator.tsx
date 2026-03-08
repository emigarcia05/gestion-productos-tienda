"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import MensajeProceso from "@/components/shared/MensajeProceso";

const POLL_INTERVAL_MS = 1000;

export default function ImportStatusIndicator() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ creados: number; actualizados: number; errores: string[] } | null>(null);
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

  // Toast al terminar (solo una vez por ciclo)
  useEffect(() => {
    if (!done || lastDoneRef.current) return;
    lastDoneRef.current = true;
    if (error) {
      toast.error(error);
    } else if (result) {
      if (result.errores.length === 0) {
        toast.success("Importación completada.");
      } else {
        toast.warning(`Importación con ${result.errores.length} advertencia(s).`);
      }
    }
  }, [done, error, result]);

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
