"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaGastos, { type GastoFila } from "@/components/finanzas/TablaGastos";
import NuevoGastoModal, {
  type SucursalOptionFila,
} from "@/components/finanzas/NuevoGastoModal";
import CrearFinBalGastoModal from "@/components/finanzas/CrearFinBalGastoModal";
import type { FinBalGastoJerarquiaTipo } from "@/services/finBalGastosCatalogo.service";

interface Props {
  filas: GastoFila[];
  sucursales: SucursalOptionFila[];
  jerarquiaGastos: FinBalGastoJerarquiaTipo[];
  esEditor: boolean;
}

export default function FinanzasBalanceGastosPageClient({
  filas,
  sucursales,
  jerarquiaGastos,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openNuevoMovimiento, setOpenNuevoMovimiento] = useState(false);
  const [openCrearGasto, setOpenCrearGasto] = useState(false);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Balance"
        subtitle="Gastos"
        actions={
          esEditor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCrearGasto(true)}
                className="h-10 gap-2 px-4"
              >
                <FolderPlus className="h-4 w-4 shrink-0" aria-hidden />
                Crear Gasto
              </Button>
              <Button
                type="button"
                onClick={() => setOpenNuevoMovimiento(true)}
                className="h-10 px-4 gap-2"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                Nuevo Gasto
              </Button>
            </div>
          ) : undefined
        }
      >
        <TablaGastos filas={filas} />
        <NuevoGastoModal
          open={openNuevoMovimiento}
          onOpenChange={setOpenNuevoMovimiento}
          sucursales={sucursales}
          onCreated={() => router.refresh()}
        />
        <CrearFinBalGastoModal
          open={openCrearGasto}
          onOpenChange={setOpenCrearGasto}
          jerarquia={jerarquiaGastos}
          onCreated={() => router.refresh()}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
