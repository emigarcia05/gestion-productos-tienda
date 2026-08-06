"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import GastoUnicoBalanceModal from "@/components/finanzas/GastoUnicoBalanceModal";
import { Button } from "@/components/ui/button";

interface Props {
  mes: number;
  anio: number;
  sucursalesCentroCosto: { id: string; nombre: string }[];
}

export default function CargarGastoPageClient({ mes, anio, sucursalesCentroCosto }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="area-page-shell">
      <SectionHeader titulo="Cargar Gastos" />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-6">
        {!modalOpen ? (
          <Button type="button" className="h-10 gap-2 px-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            NUEVO GASTO EVENTUAL
          </Button>
        ) : null}
      </div>

      <GastoUnicoBalanceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mes={mes}
        anio={anio}
        sucursalesCentroCosto={sucursalesCentroCosto}
        onSuccess={() => {
          setModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
