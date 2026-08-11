"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import {
  PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES,
  PEDIDO_A_FABRICA_MESES_PROM_VTA,
  etiquetaPeriodoMesAnio,
  periodosUltimosDosMesesCompletos,
} from "@/lib/pedidoAFabricaPromVta";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Resume fórmulas de Pedido A Fáb.: **PROM. VTA.**, fechas de llegada/stockeo y cant. sugerida.
 */
export default function InfoPromedioPedidoAFabricaModal({
  open,
  onOpenChange,
}: Props) {
  const { anterior, reciente, actual } = periodosUltimosDosMesesCompletos();

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
        <div className="flex flex-col gap-4 text-sm text-foreground">
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">PROM. VTA.</h3>
            <ul className="list-none space-y-1 pl-0">
              <li>
                Días en Mes ={" "}
                <span className="font-semibold">
                  {PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES}
                </span>
              </li>
              <li>
                Prom. Vta P/ Día ={" "}
                <span className="font-semibold">
                  (Cantidad Vendida últimos {PEDIDO_A_FABRICA_MESES_PROM_VTA}{" "}
                  meses) / (Días en Mes × {PEDIDO_A_FABRICA_MESES_PROM_VTA})
                </span>
                , redondeado al entero.
              </li>
            </ul>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              Hoy (AR) ={" "}
              <span className="font-semibold">{etiquetaPeriodoMesAnio(actual)}</span>
              . Ventas de{" "}
              <span className="font-semibold">{etiquetaPeriodoMesAnio(anterior)}</span>{" "}
              y{" "}
              <span className="font-semibold">{etiquetaPeriodoMesAnio(reciente)}</span>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Fechas</h3>
            <ul className="list-none space-y-1 pl-0">
              <li>
                Fecha Llegada Pedido ={" "}
                <span className="font-semibold">hoy + tiempo_entrega_en_dias</span>
              </li>
              <li>
                Fecha Stockeo ={" "}
                <span className="font-semibold">
                  Fecha Llegada Pedido + Tiempo Stockeo
                </span>
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Stock y Cant. Sugerida</h3>
            <ul className="list-none space-y-1 pl-0">
              <li>
                Stock a Fecha Llegada Pedido ={" "}
                <span className="font-semibold">
                  Stock Actual − (tiempo_entrega_en_dias × Prom. Vta. total)
                </span>
              </li>
              <li>
                Stock Para Tiempo Stockeo ={" "}
                <span className="font-semibold">
                  Tiempo Stockeo × Prom. Vta. total
                </span>
              </li>
              <li>
                Cant. Sugerida: si Stock a Fecha Llegada ≤ 0 →{" "}
                <span className="font-semibold">Stock Para Tiempo Stockeo</span>;
                si &gt; 0 →{" "}
                <span className="font-semibold">
                  Stock Para Tiempo Stockeo − Stock a Fecha Llegada
                </span>{" "}
                (piso 0, redondeo).
              </li>
            </ul>
          </section>
        </div>
      </AppModal>
    </Dialog>
  );
}
