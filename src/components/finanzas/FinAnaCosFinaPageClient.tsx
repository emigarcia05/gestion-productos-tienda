"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaFinAnaCosFina, { type FinAnaCosFinaFila } from "@/components/finanzas/TablaFinAnaCosFina";

interface Props {
  filas: FinAnaCosFinaFila[];
  esEditor: boolean;
}

export default function FinAnaCosFinaPageClient({ filas, esEditor }: Props) {
  const [filasState, setFilasState] = useState(filas);

  const totalHabilitados = useMemo(
    () => filasState.filter((fila) => fila.habilitado).length,
    [filasState]
  );

  function handleFilaActualizada(fila: FinAnaCosFinaFila) {
    setFilasState((prev) => prev.map((item) => (item.id === fila.id ? fila : item)));
  }

  return (
    <ClassicFilteredTableLayout
      title="Finanzas"
      subtitle="Costos Financieros"
      filters={
        <p className="px-0 py-2 text-sm text-muted-foreground">
          {totalHabilitados} DE {filasState.length} COMBINACIÓN(ES) HABILITADA(S)
        </p>
      }
      filtersAriaLabel="Resumen de costos financieros"
    >
      <TablaFinAnaCosFina
        filas={filasState}
        esEditor={esEditor}
        onFilaActualizada={handleFilaActualizada}
      />
    </ClassicFilteredTableLayout>
  );
}
