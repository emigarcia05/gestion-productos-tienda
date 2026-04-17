"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaGastos, { type GastoFila } from "@/components/finanzas/TablaGastos";
import NuevoGastoModal, {
  type SucursalOptionFila,
} from "@/components/finanzas/NuevoGastoModal";

interface Props {
  filas: GastoFila[];
  sucursales: SucursalOptionFila[];
  esEditor: boolean;
}

export default function FinanzasBalanceGastosPageClient({
  filas,
  sucursales,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openNuevo, setOpenNuevo] = useState(false);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Balance"
        subtitle="Gastos"
        actions={
          esEditor ? (
            <Button
              type="button"
              onClick={() => setOpenNuevo(true)}
              className="h-10 px-4 gap-2"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              Nuevo Gasto
            </Button>
          ) : undefined
        }
      >
        <TablaGastos filas={filas} />
        <NuevoGastoModal
          open={openNuevo}
          onOpenChange={setOpenNuevo}
          sucursales={sucursales}
          onCreated={() => router.refresh()}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
