"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import ToolbarActionButton from "@/components/shared/ToolbarActionButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { probarPutAjusteStockDuxAction } from "@/actions/stock";
import type { Sucursal } from "@/actions/stock";
import { DUX_API_BATCH_INTERVAL_MS } from "@/lib/duxApiBatchPolicy";
import { leerUsuarioSesion } from "@/lib/usuarioSesion";
import type { TablaStockHandle } from "./TablaStock";

interface Props {
  tableRef: React.RefObject<TablaStockHandle | null>;
  sucursal: Sucursal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Prueba PUT DUX: mismos ítems que Exportar Excel (solo variación).
 * Body: cod_tienda, stock, deposito, usuario.
 */
export default function PruebaPutStockDuxButton({ tableRef, sucursal }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const usuario = leerUsuarioSesion();
    if (!usuario) {
      toast.error("Elegí un usuario en el slidenav antes de probar la API.");
      return;
    }
    const filas = tableRef.current?.collectFilasVariacion() ?? [];
    if (filas.length === 0) {
      toast.error("No hay ítems con variación para enviar (igual que el Excel).");
      return;
    }

    setLoading(true);
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        toast.message(`Ajustando stock DUX ${i + 1}/${filas.length}: ${fila.codItem}`);
        const res = await probarPutAjusteStockDuxAction({
          sucursal,
          usuario: usuario.idPersonal,
          codTienda: fila.codItem,
          stock: fila.cantidad,
        });
        if (res.ok) {
          okCount += 1;
        } else {
          failCount += 1;
          toast.error(`${fila.codItem}: ${res.error}`);
        }
        if (i < filas.length - 1) {
          await sleep(DUX_API_BATCH_INTERVAL_MS);
        }
      }
      if (failCount === 0) {
        toast.success(`Prueba API PUT: ${okCount} ítem(s) aceptados por DUX.`);
      } else {
        toast.error(
          `Prueba API PUT: ${okCount} ok, ${failCount} error(es). Revisá el detalle.`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToolbarActionButton
          label="Prueba API PUT"
          icon={<FlaskConical />}
          loading={loading}
          loadingLabel="Enviando…"
          className="btn-primario-gestion shrink-0"
          onClick={() => void handleClick()}
        />
      </TooltipTrigger>
      <TooltipContent>
        Lee la ficha en DUX y ajusta el stock del depósito (solo ítems con variación)
      </TooltipContent>
    </Tooltip>
  );
}
