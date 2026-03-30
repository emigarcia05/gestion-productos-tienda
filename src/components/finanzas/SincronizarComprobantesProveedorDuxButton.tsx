"use client";

import { useState } from "react";
import { toast } from "sonner";
import DuxSyncStyleButton from "@/components/shared/DuxSyncStyleButton";
import { sincronizarComprobantesProveedorDesdeDuxAction } from "@/actions/comprobantesProveedor";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";

export default function SincronizarComprobantesProveedorDuxButton() {
  const [loading, setLoading] = useState(false);
  const [lastOkAt, setLastOkAt] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await sincronizarComprobantesProveedorDesdeDuxAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo consultar compras.");
        return;
      }
      const d = res.data;
      setLastOkAt(new Date().toISOString());
      const conError = d.detalleSucursal.filter((s) => s.error);
      if (conError.length > 0) {
        toast.warning(
          `Comprobantes actualizados: ${d.upserts} filas. Algunas sucursales respondieron con error en DUX.`
        );
      } else {
        toast.success(`Comprobantes actualizados: ${d.upserts} filas.`);
      }
    } finally {
      setLoading(false);
    }
  }

  const elapsed = formatLastCompletedAtElapsed(lastOkAt);

  return (
    <div className="w-full max-w-md">
      <DuxSyncStyleButton
        lineIdle={loading ? "CONSULTANDO COMPRAS…" : "COMPRAS DUX"}
        lineHover={loading ? "CONSULTANDO COMPRAS…" : "CONSULTAR COMPRAS"}
        secondary={loading ? "…" : `Últ. Act.: ${elapsed ?? "—"}`}
        aria-label="Consultar Compras Desde DUX"
        onClick={handleClick}
        disabled={loading}
        busy={loading}
        surface="sidebar"
      />
    </div>
  );
}
