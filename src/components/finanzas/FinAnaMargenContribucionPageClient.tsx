"use client";

import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaFinAnaMargenContribucion, {
  INPUTS_MARGEN_CONTRIBUCION_VACIOS,
  inputsMargenContribucionDesdeNumeros,
} from "@/components/finanzas/TablaFinAnaMargenContribucion";
import ElegirProductoMargenContribucionModal from "@/components/finanzas/ElegirProductoMargenContribucionModal";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PorcentajeCentInput from "@/components/shared/PorcentajeCentInput";
import {
  FIN_ANA_MC_FORMAS_PAGO,
  FIN_ANA_MC_MODOS_EVALUACION,
  FIN_ANA_MC_TIPOS_COMPROBANTE,
  etiquetaModoEvaluacionMargenContribucion,
  etiquetaTipoComprobanteVentaMargenContribucion,
  mapCxFinancieroPorFormaPago,
  type ModoEvaluacionMargenContribucion,
  type TipoComprobanteVentaMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import { getProductoDatosMargenContribucionAction } from "@/actions/finAnaMargenContribucion";
import { MARGEN_PX_LISTA_MAX_CENTS } from "@/lib/pxListasPreciosFormat";
import {
  parsePorcentajeCentNormalized,
} from "@/lib/porcentajeCentMask";
import type { FinAnaCosFinaItem } from "@/services/finAnaCosFina.service";
import type { FinAnaCosFinaTerminalItem } from "@/lib/finAnaCosFinaTerminales";
import type { ProductoTiendaRowBusqueda } from "@/services/productosTienda.service";
import { toast } from "sonner";

interface Props {
  filasCostosFinancieros: FinAnaCosFinaItem[];
  terminales: FinAnaCosFinaTerminalItem[];
  esEditor: boolean;
}

type ProductoSeleccionadoMargenContribucion = {
  codTienda: string;
  descripcion: string;
  porcUtilidadPct: number | null;
};

const CONFIG_MARGEN_CONTRIBUCION_VACIA = {
  terminalId: "",
  modoEvaluacion: "porc_utilidad" as ModoEvaluacionMargenContribucion,
  tipoComprobante: "FACTURA_A" as TipoComprobanteVentaMargenContribucion,
  porcUtilidadNorm: "",
  producto: null as ProductoSeleccionadoMargenContribucion | null,
};

function etiquetaFiltroMayusculas(texto: string): string {
  return texto.toLocaleUpperCase("es");
}

export default function FinAnaMargenContribucionPageClient({
  filasCostosFinancieros,
  terminales,
  esEditor,
}: Props) {
  const [config, setConfig] = useState(CONFIG_MARGEN_CONTRIBUCION_VACIA);
  const [inputs, setInputs] = useState(INPUTS_MARGEN_CONTRIBUCION_VACIOS);
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [cargandoProducto, setCargandoProducto] = useState(false);

  const cxFinancieroPorFormaPago = useMemo(
    () =>
      mapCxFinancieroPorFormaPago(
        filasCostosFinancieros,
        config.terminalId || undefined
      ),
    [filasCostosFinancieros, config.terminalId]
  );

  const porcUtilidadPct = useMemo(() => {
    if (config.modoEvaluacion === "producto") {
      return config.producto?.porcUtilidadPct ?? 0;
    }
    return (
      parsePorcentajeCentNormalized(
        config.porcUtilidadNorm,
        MARGEN_PX_LISTA_MAX_CENTS
      ) ?? 0
    );
  }, [config]);

  const pxListaEditable =
    config.modoEvaluacion !== "producto" || config.producto == null;

  async function elegirProducto(row: ProductoTiendaRowBusqueda) {
    setCargandoProducto(true);
    const res = await getProductoDatosMargenContribucionAction({
      codTienda: row.codTienda,
    });
    setCargandoProducto(false);

    if (!res.ok) {
      toast.error(res.error ?? "No se pudo cargar el producto.");
      return;
    }

    const datos = res.data;
    if (datos.pxLista == null || !(datos.pxLista > 0)) {
      toast.error("El producto no tiene precio en la lista principal.");
      return;
    }

    setConfig((prev) => ({
      ...prev,
      modoEvaluacion: "producto",
      producto: {
        codTienda: datos.codTienda,
        descripcion: datos.descripcionTienda,
        porcUtilidadPct: datos.porcUtilidadPct,
      },
      porcUtilidadNorm: "",
    }));
    setInputs(
      inputsMargenContribucionDesdeNumeros({
        pxLista: datos.pxLista,
        descuentoPct: inputs.descuentoPct,
      })
    );

    if (datos.porcUtilidadPct == null) {
      toast.warning("Sin costo de compra válido: CX MERCADERÍA no se calculará.");
    }
  }

  function limpiarFiltros() {
    setConfig(CONFIG_MARGEN_CONTRIBUCION_VACIA);
    setInputs(INPUTS_MARGEN_CONTRIBUCION_VACIOS);
  }

  function cambiarModoEvaluacion(modo: ModoEvaluacionMargenContribucion) {
    setConfig((prev) => ({
      ...prev,
      modoEvaluacion: modo,
      producto: modo === "producto" ? prev.producto : null,
      porcUtilidadNorm: modo === "porc_utilidad" ? prev.porcUtilidadNorm : "",
    }));
    if (modo === "porc_utilidad") {
      setInputs((prev) => ({ ...prev, pxListaNorm: "" }));
    } else if (modo === "producto") {
      setModalProductoAbierto(true);
    }
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Margen Contribución"
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

                <div
                  className={cn(
                    FILTER_INLINE_ACTION_SLOT_CLASS,
                    "col-span-2"
                  )}
                >
                  <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
                    {FIN_ANA_MC_FORMAS_PAGO.length} FORMA(S) DE PAGO
                  </span>
                  <LimpiarFiltrosButton onClick={limpiarFiltros} />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>

            <FilterRowSelection className="w-full min-w-0">
              <FilaFiltrosDesplegables columnas={4}>
                <FiltroIndividualContainer
                  className={FILTER_SELECT_WRAPPER_CLASS}
                  activo={config.modoEvaluacion !== "porc_utilidad"}
                  onLimpiar={() => cambiarModoEvaluacion("porc_utilidad")}
                >
                  <Select
                    value={config.modoEvaluacion}
                    onValueChange={(value) =>
                      cambiarModoEvaluacion(
                        value as ModoEvaluacionMargenContribucion
                      )
                    }
                  >
                    <SelectTrigger className="input-filtro-unificado w-full">
                      <SelectValue placeholder="TIPO DE ANÁLISIS" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {FIN_ANA_MC_MODOS_EVALUACION.map((modo) => (
                        <SelectItem key={modo} value={modo}>
                          {etiquetaModoEvaluacionMargenContribucion(modo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                {config.modoEvaluacion === "producto" ? (
                  <FiltroIndividualContainer
                    className={cn(FILTER_SELECT_WRAPPER_CLASS, "col-span-3")}
                    activo={Boolean(config.producto)}
                    onLimpiar={() => {
                      setConfig((prev) => ({ ...prev, producto: null }));
                      setInputs((prev) => ({ ...prev, pxListaNorm: "" }));
                    }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="input-filtro-unificado h-9 min-h-9 max-h-9 w-full justify-start gap-2 truncate border-primary text-xs font-normal uppercase"
                      onClick={() => setModalProductoAbierto(true)}
                      disabled={cargandoProducto}
                    >
                      <PackageSearch className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">
                        {config.producto
                          ? `${config.producto.codTienda} — ${config.producto.descripcion}`
                          : "ELEGIR PRODUCTO"}
                      </span>
                    </Button>
                  </FiltroIndividualContainer>
                ) : (
                  <FiltroIndividualContainer
                    className={cn(FILTER_SELECT_WRAPPER_CLASS, "col-span-3")}
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
                      className="input-filtro-unificado h-9 min-h-9 max-h-9 w-full border-primary text-xs"
                      aria-label="Porc. utilidad"
                      title="Porc. utilidad (CX MERCADERÍA)"
                    />
                  </FiltroIndividualContainer>
                )}
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
        filtersAriaLabel="Configuración de margen contribución"
      >
        <TablaFinAnaMargenContribucion
          formasPago={FIN_ANA_MC_FORMAS_PAGO}
          cxFinancieroPorFormaPago={cxFinancieroPorFormaPago}
          inputs={inputs}
          onInputsChange={setInputs}
          porcUtilidadPct={porcUtilidadPct}
          tipoComprobante={config.tipoComprobante}
          pxListaEditable={pxListaEditable}
          esEditor={esEditor}
        />
      </ClassicFilteredTableLayout>

      <ElegirProductoMargenContribucionModal
        open={modalProductoAbierto}
        onOpenChange={setModalProductoAbierto}
        onElegir={elegirProducto}
      />
    </>
  );
}
