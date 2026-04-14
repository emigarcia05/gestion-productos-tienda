"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TablaTesoreriaCajas, { type TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import NuevaCajaTesoreriaModal from "@/components/finanzas/NuevaCajaTesoreriaModal";

interface SucursalOption {
  id: string;
  nombre: string;
}

interface Props {
  filas: TesoreriaCajaFila[];
  sucursales: SucursalOption[];
  esEditor: boolean;
}

export default function FinanzasTesoreriaPageClient({
  filas,
  sucursales,
  esEditor,
}: Props) {
  const router = useRouter();
  const [openNuevaCaja, setOpenNuevaCaja] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end px-4 pb-2 sm:px-6 lg:px-8">
        {esEditor ? (
          <Button
            type="button"
            onClick={() => setOpenNuevaCaja(true)}
            className="btn-primario-gestion h-10 px-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Caja
          </Button>
        ) : null}
      </div>

      <TablaTesoreriaCajas filas={filas} />

      <NuevaCajaTesoreriaModal
        open={openNuevaCaja}
        onOpenChange={setOpenNuevaCaja}
        sucursales={sucursales}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
