"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TablaFlujoDeFondoDetalleDia } from "@/components/finanzas/TablaFlujoDeFondo";
import TablaVencimientosGastosNoMercaderia from "@/components/finanzas/TablaVencimientosGastosNoMercaderia";
import type { ProveedorNoMercaderiaObligacionVencidaFila } from "@/services/finBalGastoMensualBalance.service";
import type { FlujoFondoDetalleDiaFila } from "@/services/vencimientosPorFecha.service";

export interface FinanzasVencimientosGastosPageClientProps {
  proveedores: ProveedorNoMercaderiaObligacionVencidaFila[];
  detalleLineas: FlujoFondoDetalleDiaFila[];
}

export default function FinanzasVencimientosGastosPageClient({
  proveedores,
  detalleLineas,
}: FinanzasVencimientosGastosPageClientProps) {
  const [proveedorDetalle, setProveedorDetalle] = useState<string | null>(null);

  const filasDetalleProveedor = useMemo(() => {
    if (!proveedorDetalle) return [];
    return detalleLineas.filter((l) => l.proveedor === proveedorDetalle);
  }, [proveedorDetalle, detalleLineas]);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Venc. Provee. Gastos"
        className="min-h-0 flex-1"
        contentWidth="full"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-2">
          <TablaVencimientosGastosNoMercaderia
            filas={proveedores}
            onProveedorDoubleClick={(p) => setProveedorDetalle(p)}
          />
        </div>
      </ClassicFilteredTableLayout>

      <Dialog open={proveedorDetalle !== null} onOpenChange={(open) => !open && setProveedorDetalle(null)}>
        <AppModal
          title={
            proveedorDetalle ? (
              <span className="flex flex-col items-center gap-1 text-center">
                <span>Detalle De Vencimientos</span>
                <span className="text-sm font-normal text-primary-foreground/95">{proveedorDetalle}</span>
              </span>
            ) : (
              "Detalle De Vencimientos"
            )
          }
          size="lg"
          padding="sm"
          scrollBody={false}
          actions={
            <Button type="button" variant="outline" onClick={() => setProveedorDetalle(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <TablaFlujoDeFondoDetalleDia filas={filasDetalleProveedor} />
          </div>
        </AppModal>
      </Dialog>
    </div>
  );
}
