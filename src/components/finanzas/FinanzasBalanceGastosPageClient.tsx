"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaGastos, { type GastoFila } from "@/components/finanzas/TablaGastos";
import NuevoGastoModal, {
  type SucursalOptionFila,
} from "@/components/finanzas/NuevoGastoModal";
import CrearGastoCatalogoModal, {
  type RubroCatalogoFila,
} from "@/components/finanzas/CrearGastoCatalogoModal";

interface Props {
  filas: GastoFila[];
  sucursales: SucursalOptionFila[];
  rubros: RubroCatalogoFila[];
  esEditor: boolean;
}

export default function FinanzasBalanceGastosPageClient({
  filas,
  sucursales,
  rubros,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openNuevo, setOpenNuevo] = useState(false);
  const [openCrearCatalogo, setOpenCrearCatalogo] = useState(false);

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
                onClick={() => setOpenCrearCatalogo(true)}
                className="h-10 px-4 gap-2"
              >
                <FolderPlus className="h-4 w-4 shrink-0" aria-hidden />
                Crear Gasto
              </Button>
              <Button
                type="button"
                onClick={() => setOpenNuevo(true)}
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
          open={openNuevo}
          onOpenChange={setOpenNuevo}
          sucursales={sucursales}
          onCreated={() => router.refresh()}
        />
        <CrearGastoCatalogoModal
          open={openCrearCatalogo}
          onOpenChange={setOpenCrearCatalogo}
          rubros={rubros}
          onCreated={() => router.refresh()}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
