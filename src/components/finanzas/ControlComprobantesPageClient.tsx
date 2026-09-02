"use client";

import { useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GestionarVencimientosProveedorModal from "@/components/finanzas/GestionarVencimientosProveedorModal";
import TablaControlComprobantes from "@/components/finanzas/TablaControlComprobantes";
import { Button } from "@/components/ui/button";
import type { ProveedorMercaderiaPlazosFila } from "@/services/proveedor.service";

interface ControlComprobanteRow {
  id: string;
  fechaComp: string;
  proveedorNombre: string;
  sucursalNombre: string;
  comprobante: string;
  total: string;
  montoAplicado: string;
  vencimientoSaldo: string;
  controlado: boolean;
  plazoPagoDias: number | null;
  plazoEfectivoDias: number;
  plazoProveedorDefault: number;
  fechaVenc: string;
}

export default function ControlComprobantesPageClient({
  filas,
  proveedoresMercaderia,
  esEditor,
}: {
  filas: ControlComprobanteRow[];
  proveedoresMercaderia: ProveedorMercaderiaPlazosFila[];
  esEditor: boolean;
}) {
  const [openGestionarVenc, setOpenGestionarVenc] = useState(false);

  return (
    <div className="area-page-shell">
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Comprobantes"
        actions={
          esEditor ? (
            <Button type="button" onClick={() => setOpenGestionarVenc(true)}>
              Gestionar Venc.
            </Button>
          ) : null
        }
      >
        <TablaControlComprobantes filas={filas} esEditor={esEditor} />
      </ClassicFilteredTableLayout>

      {openGestionarVenc ? (
        <GestionarVencimientosProveedorModal
          onClose={() => setOpenGestionarVenc(false)}
          proveedores={proveedoresMercaderia}
        />
      ) : null}
    </div>
  );
}
