"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaFinAnaMargenContribucion, {
  inputsMargenContribucionDesdeNumeros,
} from "@/components/finanzas/TablaFinAnaMargenContribucion";
import FinAnaMcFormulasPanel from "@/components/finanzas/FinAnaMcFormulasPanel";
import GestionarPagosFinAnaCosFinaModal from "@/components/finanzas/GestionarPagosFinAnaCosFinaModal";
import FilterBar, {
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import {
  FIN_ANA_MC_TIPOS_COMPROBANTE,
  crearDescuentoPctPorFormaPagoVacios,
  etiquetaTipoComprobanteVentaMargenContribucion,
  idsFormasPagoMargenContribucion,
  mapCxFinancieroPorFormaPago,
  type TipoComprobanteVentaMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import {
  resolverParametrosFormulaMargenContribucion,
  type FinAnaMcFormulaItem,
} from "@/lib/finAnaMcFormulas";
import type { FinAnaCosFinaPagoItem } from "@/lib/finAnaCosFinaPagos";
import { actualizarDescuentoFpMargenContribucionAction } from "@/actions/finAnaMargenContribucion";
import { MARGEN_PX_LISTA_MAX_CENTS } from "@/lib/pxListasPreciosFormat";
import { parsePorcentajeCentNormalized } from "@/lib/porcentajeCentMask";
import type { FinAnaCosFinaItem } from "@/services/finAnaCosFina.service";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import type { DescuentoFpMargenContribucionMap } from "@/services/finAnaMcDescuentoFp.service";
import type { FormaPagoMargenContribucion } from "@/lib/finAnaMargenContribucion";
import { toast } from "sonner";

interface Props {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  pagos: FinAnaCosFinaPagoItem[];
  descuentosPorFormaPago: DescuentoFpMargenContribucionMap;
  formulas: FinAnaMcFormulaItem[];
  esEditor: boolean;
}

const CONFIG_MARGEN_CONTRIBUCION_VACIA = {
  terminalId: "",
  tipoComprobante: "FACTURA_A" as TipoComprobanteVentaMargenContribucion,
  porcUtilidadNorm: "",
};

function etiquetaFiltroMayusculas(texto: string): string {
  return texto.toLocaleUpperCase("es");
}

function inputsMargenContribucionIniciales(
  formasPago: FormaPagoMargenContribucion[],
  descuentosPorFormaPago: DescuentoFpMargenContribucionMap,
  pxLista: number
) {
  const descuentos = {
    ...crearDescuentoPctPorFormaPagoVacios(formasPago),
    ...descuentosPorFormaPago,
  };
  return inputsMargenContribucionDesdeNumeros({
    pxLista,
    descuentoPctPorFormaPago: descuentos,
    formasPago,
  });
}

export default function FinAnaMargenContribucionPageClient({
  filasCostosFinancieros,
  terminales,
  pagos,
  descuentosPorFormaPago,
  formulas: formulasIniciales,
  esEditor,
}: Props) {
  const router = useRouter();
  const formasPago = useMemo(() => idsFormasPagoMargenContribucion(pagos), [pagos]);
  const [config, setConfig] = useState(CONFIG_MARGEN_CONTRIBUCION_VACIA);
  const [descuentosBase, setDescuentosBase] = useState(descuentosPorFormaPago);
  const [formulas, setFormulas] = useState(formulasIniciales);
  const formulaParams = useMemo(
    () => resolverParametrosFormulaMargenContribucion(formulas),
    [formulas]
  );
  const [inputs, setInputs] = useState(() =>
    inputsMargenContribucionIniciales(
      formasPago,
      descuentosPorFormaPago,
      formulaParams.pxListaCIva
    )
  );
  const [modalGestionarPagosAbierto, setModalGestionarPagosAbierto] = useState(false);

  const cxFinancieroPorFormaPago = useMemo(
    () =>
      mapCxFinancieroPorFormaPago(
        filasCostosFinancieros,
        pagos,
        config.terminalId || undefined
      ),
    [filasCostosFinancieros, pagos, config.terminalId]
  );

  const porcUtilidadPct =
    parsePorcentajeCentNormalized(
      config.porcUtilidadNorm,
      MARGEN_PX_LISTA_MAX_CENTS
    ) ?? 0;

  function sincronizarPxListaDesdeFormulas(items: FinAnaMcFormulaItem[]) {
    setFormulas(items);
    const nextParams = resolverParametrosFormulaMargenContribucion(items);
    setInputs((prev) =>
      inputsMargenContribucionDesdeNumeros({
        pxLista: nextParams.pxListaCIva,
        descuentoPctPorFormaPago: prev.descuentoPctPorFormaPago,
        formasPago,
      })
    );
  }

  function limpiarFiltros() {
    setConfig(CONFIG_MARGEN_CONTRIBUCION_VACIA);
    setInputs(
      inputsMargenContribucionIniciales(
        formasPago,
        descuentosBase,
        formulaParams.pxListaCIva
      )
    );
  }

  function handleCatalogoPagosChanged() {
    router.refresh();
  }

  async function cambiarDescuentoPorFormaPago(
    formaPago: FormaPagoMargenContribucion,
    descuentoPct: number
  ) {
    setInputs((prev) => ({
      ...prev,
      descuentoPctPorFormaPago: {
        ...prev.descuentoPctPorFormaPago,
        [formaPago]: descuentoPct,
      },
    }));

    if (!esEditor) return;

    const res = await actualizarDescuentoFpMargenContribucionAction({
      pagoId: formaPago,
      descuentoPct,
    });
    if (!res.ok) {
      toast.error(res.error ?? "No se pudo guardar el descuento.");
      return;
    }
    setDescuentosBase(res.data);
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Margen Contribución"
        actions={
          <Button
            type="button"
            onClick={() => setModalGestionarPagosAbierto(true)}
            className="h-10 gap-2 px-4"
          >
            <Settings2 className="size-4 shrink-0" aria-hidden />
            Gestionar Pagos
          </Button>
        }
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables columnas={4}>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={Boolean(config.terminalId)}
                  onLimpiar={() =>
                    setConfig((prev) => ({ ...prev, terminalId: "" }))
                  }
                >
                  <Select
                    value={config.terminalId || undefined}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, terminalId: value }))
                    }
                  >
                    <SelectTrigger className="input-filtro-unificado w-full">
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

                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={config.tipoComprobante !== "FACTURA_A"}
                  onLimpiar={() =>
                    setConfig((prev) => ({
                      ...prev,
                      tipoComprobante: "FACTURA_A",
                    }))
                  }
                >
                  <Select
                    value={config.tipoComprobante}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        tipoComprobante:
                          value as TipoComprobanteVentaMargenContribucion,
                      }))
                    }
                  >
                    <SelectTrigger className="input-filtro-unificado w-full">
                      <SelectValue placeholder="TIPO DE COMPROBANTE" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {FIN_ANA_MC_TIPOS_COMPROBANTE.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {etiquetaTipoComprobanteVentaMargenContribucion(tipo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  className={cn(FILTER_SELECT_WRAPPER_CLASS, "col-span-1")}
                  activo={Boolean(config.porcUtilidadNorm.trim())}
                  onLimpiar={() =>
                    setConfig((prev) => ({ ...prev, porcUtilidadNorm: "" }))
                  }
                >
                  <PorcentajeCentInput
                    valueNormalized={config.porcUtilidadNorm}
                    maxCents={MARGEN_PX_LISTA_MAX_CENTS}
                    onValueNormalizedChange={(next) =>
                      setConfig((prev) => ({
                        ...prev,
                        porcUtilidadNorm: next,
                      }))
                    }
                    className="input-filtro-unificado w-full max-w-[9rem] border-primary text-xs"
                    aria-label="Porc. utilidad"
                    title="Porc. utilidad (CX MERCADERÍA)"
                    disabled={!esEditor}
                  />
                </FiltroIndividualContainer>

                <div
                  className={cn(
                    FILTER_INLINE_ACTION_SLOT_CLASS,
                    "justify-end"
                  )}
                >
                  <LimpiarFiltrosButton onClick={limpiarFiltros} />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
        filtersAriaLabel="Configuración de margen contribución"
      >
        <div className="flex h-full min-h-0 w-full flex-col gap-2">
          <FinAnaMcFormulasPanel
            formulasIniciales={formulas}
            esEditor={esEditor}
            onFormulasChange={sincronizarPxListaDesdeFormulas}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <TablaFinAnaMargenContribucion
              formasPago={formasPago}
              pagosCatalogo={pagos}
              cxFinancieroPorFormaPago={cxFinancieroPorFormaPago}
              inputs={inputs}
              onDescuentoPorFormaPagoChange={cambiarDescuentoPorFormaPago}
              porcUtilidadPct={porcUtilidadPct}
              tipoComprobante={config.tipoComprobante}
              formulaParams={formulaParams}
              esEditor={esEditor}
            />
          </div>
        </div>
      </ClassicFilteredTableLayout>

      <GestionarPagosFinAnaCosFinaModal
        open={modalGestionarPagosAbierto}
        onOpenChange={setModalGestionarPagosAbierto}
        pagosIniciales={pagos}
        esEditor={esEditor}
        onCatalogoChanged={handleCatalogoPagosChanged}
      />
    </>
  );
}
