"use client";

import type { ReactNode } from "react";
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

function FormulaLine({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <li className="flex flex-wrap gap-x-1">
      <span className="font-semibold shrink-0">{left}</span>
      <span className="font-normal text-foreground">= {right}</span>
    </li>
  );
}

/**
 * Modal **Info Formulas** (Pedido A Fáb.): PROM. VTA., fechas y cant. sugerida.
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
        title="Info Formulas"
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-foreground">
          <section className="flex flex-col gap-2" aria-labelledby="info-formulas-prom-vta">
            <h3 id="info-formulas-prom-vta" className="font-semibold tracking-wide">
              PROM. VTA.
            </h3>
            <ul className="list-none space-y-1 pl-0">
              <FormulaLine
                left="Días en Mes"
                right={PEDIDO_A_FABRICA_DIAS_VENTA_POR_MES}
              />
              <FormulaLine
                left="Prom. Vta P/ Día"
                right={
                  <>
                    (Cantidad Vendida últimos {PEDIDO_A_FABRICA_MESES_PROM_VTA}{" "}
                    meses) / (Días en Mes × {PEDIDO_A_FABRICA_MESES_PROM_VTA}),
                    redondeado al entero
                  </>
                }
              />
            </ul>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
              <span className="font-semibold">Hoy (AR)</span>
              {" = "}
              {etiquetaPeriodoMesAnio(actual)}. Ventas de{" "}
              {etiquetaPeriodoMesAnio(anterior)} y{" "}
              {etiquetaPeriodoMesAnio(reciente)}.
            </p>
          </section>

          <hr className="border-border" />

          <section className="flex flex-col gap-2" aria-labelledby="info-formulas-fechas">
            <h3 id="info-formulas-fechas" className="font-semibold tracking-wide">
              FECHAS
            </h3>
            <ul className="list-none space-y-1 pl-0">
              <FormulaLine
                left="Fecha Llegada Pedido"
                right="hoy + tiempo_entrega_en_dias"
              />
              <FormulaLine
                left="Fecha Stockeo"
                right="Fecha Llegada Pedido + Tiempo Stockeo"
              />
            </ul>
          </section>

          <hr className="border-border" />

          <section
            className="flex flex-col gap-2"
            aria-labelledby="info-formulas-stock"
          >
            <h3 id="info-formulas-stock" className="font-semibold tracking-wide">
              STOCK Y CANT. SUGERIDA
            </h3>
            <ul className="list-none space-y-1 pl-0">
              <FormulaLine
                left="Stock Actual En Días"
                right="Stock Actual En Unidades / Prom. Vta. P/ Día (redondeo; vacío si prom = 0)"
              />
              <FormulaLine
                left="Stock a Fecha Llegada Pedido"
                right="Stock Actual − (tiempo_entrega_en_dias × Prom. Vta. total)"
              />
              <FormulaLine
                left="Stock Para Tiempo Stockeo"
                right="Tiempo Stockeo × Prom. Vta. total"
              />
            </ul>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Cant. Sugerida:</p>
              <ul className="list-none space-y-1 pl-4">
                <li>
                  <span className="font-semibold">
                    Si Stock a Fecha Llegada ≤ 0
                  </span>
                  {" → "}
                  Stock Para Tiempo Stockeo
                </li>
                <li>
                  <span className="font-semibold">
                    Si Stock a Fecha Llegada &gt; 0
                  </span>
                  {" → "}
                  Stock Para Tiempo Stockeo − Stock a Fecha Llegada (piso 0,
                  redondeo)
                </li>
              </ul>
            </div>
          </section>
        </div>
      </AppModal>
    </Dialog>
  );
}
