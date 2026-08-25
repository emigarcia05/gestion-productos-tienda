"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import ToolbarActionButton from "@/components/shared/ToolbarActionButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  exportarCostoCxDiffAction,
  probarPutCostoCxDuxAction,
} from "@/actions/cxPxTienda";
import { DUX_API_BATCH_INTERVAL_MS } from "@/lib/duxApiBatchPolicy";
import { leerUsuarioSesion } from "@/lib/usuarioSesion";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function fmtCosto(n: number): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Prueba PUT DUX de costo CX: mismos ítems que Act. Cx. (diff ≥ 0,01).
 * Usuario slidenav = `id_personal`; `costo_compra` = CX PROD.; sin `stock[]`.
 */
export default function PruebaPutCxButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const usuario = leerUsuarioSesion();
    if (!usuario) {
      toast.error("Elegí un usuario en el slidenav antes de probar la API.");
      return;
    }

    setLoading(true);
    let okCount = 0;
    let failCount = 0;
    let sinImpacto = 0;
    try {
      const listado = await exportarCostoCxDiffAction();
      if (!listado.ok) {
        toast.error(listado.error ?? "No se pudo listar las diferencias de Cx.");
        return;
      }
      const filas = listado.data.filas;
      if (filas.length === 0) {
        toast.error("No hay ítems con diferencia de Cx. para enviar (igual que Act. Cx.).");
        return;
      }

      for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        toast.message(
          `PUT Cx DUX ${i + 1}/${filas.length}: ${fila.codigo} (PUT + GET de control)`
        );
        const res = await probarPutCostoCxDuxAction({
          usuario: usuario.idPersonal,
          codTienda: fila.codigo,
        });
        if (!res.ok) {
          failCount += 1;
          toast.error(`${fila.codigo}: ${res.error}`);
        } else if (!res.data.impacto) {
          sinImpacto += 1;
          const leido = res.data.leido;
          const leidoTxt =
            leido == null
              ? "GET no trajo el ítem"
              : `GET costo=${fmtCosto(leido.costo)}`;
          toast.error(
            `${fila.codigo}: PUT ${res.data.httpStatus} costo=${fmtCosto(res.data.enviado.costoCompra)}. ${leidoTxt}. No impactó.`
          );
        } else {
          okCount += 1;
          const leido = res.data.leido;
          toast.success(
            `${fila.codigo}: DUX ahora costo=${fmtCosto(leido?.costo ?? res.data.enviado.costoCompra)}`
          );
        }
        if (i < filas.length - 1) {
          await sleep(DUX_API_BATCH_INTERVAL_MS);
        }
      }
      if (failCount === 0 && sinImpacto === 0) {
        toast.success(
          `Prueba PUT Cx: ${okCount} ítem(s) confirmados en GET DUX.`
        );
      } else {
        toast.error(
          `Prueba PUT Cx: ${okCount} impactó, ${sinImpacto} sin cambio, ${failCount} error(es).`
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
          label="Prueba PUT Cx"
          icon={<FlaskConical />}
          loading={loading}
          loadingLabel="Enviando…"
          className="btn-primario-gestion shrink-0"
          onClick={() => void handleClick()}
        />
      </TooltipTrigger>
      <TooltipContent>
        PUT a DUX del costo CX PROD. (mismos ítems que Act. Cx.) y GET de control
      </TooltipContent>
    </Tooltip>
  );
}
