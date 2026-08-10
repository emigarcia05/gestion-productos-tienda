"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import {
  PEDIDO_A_FABRICA_DIAS_PROM_VTA,
  PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES,
  PEDIDO_A_FABRICA_MESES_PROM_VTA,
  calcularPromVtaDiariaDesdeTotal,
  etiquetaPeriodoMesAnio,
  periodosUltimosDosMesesCompletos,
} from "@/lib/pedidoAFabricaPromVta";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Explica el cálculo de **PROM. VTA.** (últimos 2 meses / 48 días, redondeo).
 */
export default function InfoPromedioPedidoAFabricaModal({
  open,
  onOpenChange,
}: Props) {
  const { anterior, reciente, actual } = periodosUltimosDosMesesCompletos();
  const ejemploTotal = 220;
  const ejemploProm = calcularPromVtaDiariaDesdeTotal(ejemploTotal);
  const ejemploCrudo = ejemploTotal / PEDIDO_A_FABRICA_DIAS_PROM_VTA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="md"
        padding="sm"
        title="Info Promedio"
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-foreground">
          <p>
            La columna <span className="font-semibold">PROM. VTA.</span> estima el
            promedio de unidades vendidas por día de venta, con estos criterios:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Se toman las ventas de los{" "}
              <span className="font-semibold">
                {PEDIDO_A_FABRICA_MESES_PROM_VTA} meses calendario completos
              </span>{" "}
              anteriores al mes actual.
            </li>
            <li>
              Cada mes se considera con{" "}
              <span className="font-semibold">
                {PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES} días de venta
              </span>
              ; en total el denominador es{" "}
              <span className="font-semibold">
                {PEDIDO_A_FABRICA_DIAS_PROM_VTA} días
              </span>
              .
            </li>
            <li>
              Fórmula:{" "}
              <span className="font-semibold">
                (venta mes 1 + venta mes 2) / {PEDIDO_A_FABRICA_DIAS_PROM_VTA}
              </span>
              , redondeado al entero más cercano.
            </li>
          </ul>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            Periodo vigente (hoy en Argentina ={" "}
            <span className="font-semibold">{etiquetaPeriodoMesAnio(actual)}</span>
            ): se usan{" "}
            <span className="font-semibold">{etiquetaPeriodoMesAnio(anterior)}</span> y{" "}
            <span className="font-semibold">{etiquetaPeriodoMesAnio(reciente)}</span>.
          </p>

          <div className="rounded-md border border-border px-3 py-2">
            <p className="mb-1 font-semibold">Ejemplo</p>
            <p className="text-muted-foreground">
              Total vendido junio = 100 · Total vendido julio = 120
            </p>
            <p className="text-muted-foreground">
              Total últimos 2 meses = {ejemploTotal} / {PEDIDO_A_FABRICA_DIAS_PROM_VTA}{" "}
              ({PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES} días ×{" "}
              {PEDIDO_A_FABRICA_MESES_PROM_VTA} meses)
            </p>
            <p>
              Promedio por día ={" "}
              {ejemploCrudo.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              → se redondea a{" "}
              <span className="font-semibold">{ejemploProm}</span>.
            </p>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
