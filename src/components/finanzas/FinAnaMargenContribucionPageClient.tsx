"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaFinAnaMargenContribucion, {
  INPUTS_MARGEN_CONTRIBUCION_VACIOS,
} from "@/components/finanzas/TablaFinAnaMargenContribucion";
import FilterBar, {
  FILTER_COUNT_CLASS,
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowSelection,
  LimpiarFiltrosButton,
} from "@/components/FilterBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FIN_ANA_MC_FORMAS_PAGO,
} from "@/lib/finAnaMargenContribucion";
import { mapCxFinancieroPorFormaPago } from "@/services/finAnaMargenContribucion.service";
import type { FinAnaCosFinaItem } from "@/services/finAnaCosFina.service";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";

interface Props {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  esEditor: boolean;
}

function etiquetaFiltroMayusculas(texto: string): string {
  return texto.toLocaleUpperCase("es");
}

export default function FinAnaMargenContribucionPageClient({
  filasCostosFinancieros,
  terminales,
  esEditor,
}: Props) {
  const [filtroTerminalId, setFiltroTerminalId] = useState("");
  const [inputs, setInputs] = useState(INPUTS_MARGEN_CONTRIBUCION_VACIOS);

  const cxFinancieroPorFormaPago = useMemo(
    () =>
      mapCxFinancieroPorFormaPago(
        filasCostosFinancieros,
        filtroTerminalId || undefined
      ),
    [filasCostosFinancieros, filtroTerminalId]
  );

  function limpiarFiltros() {
    setFiltroTerminalId("");
  }

  return (
    <ClassicFilteredTableLayout
      title="Finanzas"
      subtitle="Margen Contribución"
      filters={
        <FilterBar className="filtros-contenedor-tienda bg-card">
          <FilterRowSelection>
            <FilaFiltrosDesplegables>
              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={Boolean(filtroTerminalId)}
                onLimpiar={() => setFiltroTerminalId("")}
              >
                <Select
                  value={filtroTerminalId || undefined}
                  onValueChange={(value) => setFiltroTerminalId(value)}
                >
                  <SelectTrigger className="input-filtro-unificado">
                    <SelectValue placeholder="TERMINAL" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    {terminales.map((terminal) => (
                      <SelectItem key={terminal.id} value={terminal.id}>
                        {etiquetaFiltroMayusculas(terminal.nombre)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-2")}>
                <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
                  {FIN_ANA_MC_FORMAS_PAGO.length} FORMA(S) DE PAGO
                </span>
                <LimpiarFiltrosButton onClick={limpiarFiltros} />
              </div>
            </FilaFiltrosDesplegables>
          </FilterRowSelection>
        </FilterBar>
      }
      filtersAriaLabel="Filtros de margen contribución"
    >
      <TablaFinAnaMargenContribucion
        formasPago={FIN_ANA_MC_FORMAS_PAGO}
        cxFinancieroPorFormaPago={cxFinancieroPorFormaPago}
        inputs={inputs}
        onInputsChange={setInputs}
        esEditor={esEditor}
      />
    </ClassicFilteredTableLayout>
  );
}
