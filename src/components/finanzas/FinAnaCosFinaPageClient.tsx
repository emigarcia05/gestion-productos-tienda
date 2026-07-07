"use client";

import { useMemo, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaFinAnaCosFina, { type FinAnaCosFinaFila } from "@/components/finanzas/TablaFinAnaCosFina";
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
  etiquetaPagoFinAnaCosFina,
  etiquetaTerminalFinAnaCosFina,
  FIN_ANA_COS_FINA_PAGOS,
  FIN_ANA_COS_FINA_TERMINALES,
} from "@/lib/finAnaCosFina";

interface Props {
  filas: FinAnaCosFinaFila[];
  esEditor: boolean;
}

function etiquetaFiltroMayusculas(texto: string): string {
  return texto.toLocaleUpperCase("es");
}

export default function FinAnaCosFinaPageClient({ filas, esEditor }: Props) {
  const [filasState, setFilasState] = useState(filas);
  const [filtroTerminal, setFiltroTerminal] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [filtroHabilitado, setFiltroHabilitado] = useState("");

  const filasFiltradas = useMemo(
    () =>
      filasState.filter((fila) => {
        if (filtroTerminal && fila.terminal !== filtroTerminal) return false;
        if (filtroPago && fila.pago !== filtroPago) return false;
        if (filtroHabilitado === "si" && !fila.habilitado) return false;
        if (filtroHabilitado === "no" && fila.habilitado) return false;
        return true;
      }),
    [filasState, filtroTerminal, filtroPago, filtroHabilitado]
  );

  function limpiarFiltros() {
    setFiltroTerminal("");
    setFiltroPago("");
    setFiltroHabilitado("");
  }

  function handleFilaActualizada(fila: FinAnaCosFinaFila) {
    setFilasState((prev) => prev.map((item) => (item.id === fila.id ? fila : item)));
  }

  return (
    <ClassicFilteredTableLayout
      title="Finanzas"
      subtitle="Costos Financieros"
      filters={
        <FilterBar className="filtros-contenedor-tienda bg-card">
          <FilterRowSelection>
            <FilaFiltrosDesplegables>
              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={Boolean(filtroTerminal)}
                onLimpiar={() => setFiltroTerminal("")}
              >
                <Select
                  value={filtroTerminal || undefined}
                  onValueChange={(value) => setFiltroTerminal(value)}
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
                    {FIN_ANA_COS_FINA_TERMINALES.map((terminal) => (
                      <SelectItem key={terminal} value={terminal}>
                        {etiquetaFiltroMayusculas(etiquetaTerminalFinAnaCosFina(terminal))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={Boolean(filtroPago)}
                onLimpiar={() => setFiltroPago("")}
              >
                <Select value={filtroPago || undefined} onValueChange={(value) => setFiltroPago(value)}>
                  <SelectTrigger className="input-filtro-unificado">
                    <SelectValue placeholder="PAGO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    {FIN_ANA_COS_FINA_PAGOS.map((pago) => (
                      <SelectItem key={pago} value={pago}>
                        {etiquetaFiltroMayusculas(etiquetaPagoFinAnaCosFina(pago))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <FiltroIndividualContainer
                className={FILTER_SELECT_WRAPPER_CLASS}
                activo={filtroHabilitado === "si" || filtroHabilitado === "no"}
                onLimpiar={() => setFiltroHabilitado("")}
              >
                <Select
                  value={filtroHabilitado || undefined}
                  onValueChange={(value) => setFiltroHabilitado(value)}
                >
                  <SelectTrigger className="input-filtro-unificado">
                    <SelectValue placeholder="HABILITADO" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="select-content-filtro"
                  >
                    <SelectItem value="si">HABILITADO</SelectItem>
                    <SelectItem value="no">NO HABILITADO</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-2")}>
                <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
                  {filasFiltradas.length} COMBINACIÓN(ES)
                </span>
                <LimpiarFiltrosButton onClick={limpiarFiltros} />
              </div>
            </FilaFiltrosDesplegables>
          </FilterRowSelection>
        </FilterBar>
      }
      filtersAriaLabel="Filtros de costos financieros"
    >
      <TablaFinAnaCosFina
        filas={filasFiltradas}
        esEditor={esEditor}
        onFilaActualizada={handleFilaActualizada}
      />
    </ClassicFilteredTableLayout>
  );
}
