"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaTesoreriaCajas, { type TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import NuevaCajaTesoreriaModal from "@/components/finanzas/NuevaCajaTesoreriaModal";
import ActualizarMontoCajaTesoreriaModal from "@/components/finanzas/ActualizarMontoCajaTesoreriaModal";
import EditarCajaTesoreriaModal from "@/components/finanzas/EditarCajaTesoreriaModal";
import EliminarCajaTesoreriaModal from "@/components/finanzas/EliminarCajaTesoreriaModal";

interface Props {
  filas: TesoreriaCajaFila[];
  esEditor: boolean;
}

export default function FinanzasTesoreriaPageClient({
  filas,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openNuevaCaja, setOpenNuevaCaja] = useState(false);
  const [cajaParaEditarMonto, setCajaParaEditarMonto] = useState<TesoreriaCajaFila | null>(null);
  const [cajaParaEditarDatos, setCajaParaEditarDatos] = useState<TesoreriaCajaFila | null>(null);
  const [cajaParaEliminar, setCajaParaEliminar] = useState<TesoreriaCajaFila | null>(null);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Tesorería"
        actions={
          esEditor ? (
            <Button
              type="button"
              onClick={() => setOpenNuevaCaja(true)}
              className="h-10 px-4 gap-2"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              Nueva Caja
            </Button>
          ) : undefined
        }
      >
        <TablaTesoreriaCajas
          filas={filas}
          esEditor={esEditor}
          onRowDoubleClick={esEditor ? (fila) => setCajaParaEditarMonto(fila) : undefined}
          onEditDataClick={esEditor ? (fila) => setCajaParaEditarDatos(fila) : undefined}
          onDeleteClick={esEditor ? (fila) => setCajaParaEliminar(fila) : undefined}
        />
        <NuevaCajaTesoreriaModal
          open={openNuevaCaja}
          onOpenChange={setOpenNuevaCaja}
          onCreated={() => router.refresh()}
        />
        <ActualizarMontoCajaTesoreriaModal
          open={cajaParaEditarMonto != null}
          onOpenChange={(open) => {
            if (!open) setCajaParaEditarMonto(null);
          }}
          caja={cajaParaEditarMonto}
          onUpdated={() => router.refresh()}
        />
        <EditarCajaTesoreriaModal
          open={cajaParaEditarDatos != null}
          onOpenChange={(open) => {
            if (!open) setCajaParaEditarDatos(null);
          }}
          caja={cajaParaEditarDatos}
          onUpdated={() => router.refresh()}
        />
        <EliminarCajaTesoreriaModal
          open={cajaParaEliminar != null}
          onOpenChange={(open) => {
            if (!open) setCajaParaEliminar(null);
          }}
          caja={cajaParaEliminar}
          onDeleted={() => router.refresh()}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
