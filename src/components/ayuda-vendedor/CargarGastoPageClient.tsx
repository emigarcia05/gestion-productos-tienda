"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
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
      <ClassicFilteredTableLayout
        title="Cargar Gastos"
        actions={
          <Button type="button" className="h-10 gap-2 px-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Nuevo Gasto Eventual
          </Button>
        }
      >
        <div className="flex h-full min-h-0 items-center justify-center" />
      </ClassicFilteredTableLayout>

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
