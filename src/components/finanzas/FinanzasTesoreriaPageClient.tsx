"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaTesoreriaCajas, { type TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import NuevaCajaTesoreriaModal from "@/components/finanzas/NuevaCajaTesoreriaModal";

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
        <TablaTesoreriaCajas filas={filas} />
        <NuevaCajaTesoreriaModal
          open={openNuevaCaja}
          onOpenChange={setOpenNuevaCaja}
          onCreated={() => router.refresh()}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
