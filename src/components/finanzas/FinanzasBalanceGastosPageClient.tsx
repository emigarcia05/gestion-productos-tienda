"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaGastos, { type BalanceGastoMensualFila } from "@/components/finanzas/TablaGastos";
import { cargarFinBalGastoMensualMesAction } from "@/actions/finBalGastoMensualBalance";

interface Props {
  filas: BalanceGastoMensualFila[];
  esEditor: boolean;
}

export default function FinanzasBalanceGastosPageClient({ filas, esEditor }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCargarMes() {
    setLoading(true);
    try {
      const res = await cargarFinBalGastoMensualMesAction();
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo cargar el mes.");
        return;
      }
      const { creados, yaExistentes } = res.data;
      if (creados > 0) {
        toast.success(
          creados === 1
            ? "Se cargó 1 imputación del mes."
            : `Se cargaron ${creados} imputaciones del mes.`
        );
      } else if (yaExistentes > 0) {
        toast.info("Las imputaciones del mes ya estaban cargadas.");
      } else {
        toast.info("No hay gastos mensuales en el catálogo para cargar.");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

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
                onClick={() => void handleCargarMes()}
                disabled={loading}
                className="h-10 px-4 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                )}
                Cargar Datos Mes.
              </Button>
            </div>
          ) : undefined
        }
      >
        <TablaGastos filas={filas} />
      </ClassicFilteredTableLayout>
    </div>
  );
}
