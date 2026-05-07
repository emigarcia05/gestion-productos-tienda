"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import TablaDeudaProveedores, {
  type DeudaProveedorRow,
} from "@/components/finanzas/TablaDeudaProveedores";
import { TablaFlujoDeFondoDetalleDia } from "@/components/finanzas/TablaFlujoDeFondo";
import type { FlujoFondoDetalleDiaFila } from "@/services/vencimientosPorFecha.service";

interface Props {
  filas: DeudaProveedorRow[];
  detalleLineas: FlujoFondoDetalleDiaFila[];
}

export default function FinanzasDeudaProveedoresPageClient({
  filas,
  detalleLineas,
}: Props) {
  const [proveedorDetalle, setProveedorDetalle] = useState<string | null>(null);

  const filasDetalleProveedor = useMemo(() => {
    if (!proveedorDetalle) return [];
    return detalleLineas.filter((l) => l.proveedor === proveedorDetalle);
  }, [proveedorDetalle, detalleLineas]);

  return (
    <div className="area-page-shell">
      <ClassicFilteredTableLayout title="Finanzas" subtitle="Venc. Provee. Merc.">
        <TablaDeudaProveedores
          filas={filas}
          onProveedorDoubleClick={(p) => setProveedorDetalle(p)}
        />
      </ClassicFilteredTableLayout>

      <Dialog
        open={proveedorDetalle !== null}
        onOpenChange={(open) => !open && setProveedorDetalle(null)}
      >
        <AppModal
          title="Detalle De Vencimientos"
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
            <TablaFlujoDeFondoDetalleDia
              filas={filasDetalleProveedor}
              emptyMessage="NO HAY COMPROBANTES PENDIENTES PARA ESTE PROVEEDOR."
            />
          </div>
        </AppModal>
      </Dialog>
    </div>
  );
}
