"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import TablaTesoreriaCajas, { type TesoreriaCajaFila } from "@/components/finanzas/TablaTesoreriaCajas";
import ChequesCajaTesoreriaModal from "@/components/finanzas/ChequesCajaTesoreriaModal";
import NuevaCajaTesoreriaModal from "@/components/finanzas/NuevaCajaTesoreriaModal";
import ActualizarMontoCajaTesoreriaModal from "@/components/finanzas/ActualizarMontoCajaTesoreriaModal";
import EditarCajaTesoreriaModal from "@/components/finanzas/EditarCajaTesoreriaModal";
import EliminarCajaTesoreriaModal from "@/components/finanzas/EliminarCajaTesoreriaModal";
import FilterBar, {
  FILTER_INLINE_ACTION_SLOT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
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
  const [cajaParaEditarMonto, setCajaParaEditarMonto] = useState<TesoreriaCajaFila | null>(null);
  const [cajaParaEditarDatos, setCajaParaEditarDatos] = useState<TesoreriaCajaFila | null>(null);
  const [cajaParaEliminar, setCajaParaEliminar] = useState<TesoreriaCajaFila | null>(null);
  const [cajaCheques, setCajaCheques] = useState<TesoreriaCajaFila | null>(null);
  const [filtroCaja, setFiltroCaja] = useState("");
  const [filtroTitular, setFiltroTitular] = useState("");
  const [filtroTipoCaja, setFiltroTipoCaja] = useState("");

  const cajasOptions = useMemo(
    () => [...new Set(filas.map((f) => f.nombreCaja))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );
  const titularesOptions = useMemo(
    () => [...new Set(filas.map((f) => f.titular))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );
  const tiposCajaOptions = useMemo(
    () => [...new Set(filas.map((f) => f.tipoCaja))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  const filasFiltradas = useMemo(
    () =>
      filas.filter((fila) => {
        if (filtroCaja && fila.nombreCaja !== filtroCaja) return false;
        if (filtroTitular && fila.titular !== filtroTitular) return false;
        if (filtroTipoCaja && fila.tipoCaja !== filtroTipoCaja) return false;
        return true;
      }),
    [filas, filtroCaja, filtroTitular, filtroTipoCaja]
  );

  const hayFiltros = !!filtroCaja || !!filtroTitular || !!filtroTipoCaja;

  function limpiarFiltros() {
    setFiltroCaja("");
    setFiltroTitular("");
    setFiltroTipoCaja("");
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <ClassicFilteredTableLayout
        title="Finanzas"
        subtitle="Tesorería"
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection>
              <FilaFiltrosDesplegables>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select value={filtroCaja || "none"} onValueChange={(v) => setFiltroCaja(v === "none" ? "" : v)}>
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="CAJA" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">CAJA</SelectItem>
                      {cajasOptions.map((caja) => (
                        <SelectItem key={caja} value={caja}>
                          {caja}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select
                    value={filtroTitular || "none"}
                    onValueChange={(v) => setFiltroTitular(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="TITULAR" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">TITULAR</SelectItem>
                      {titularesOptions.map((titular) => (
                        <SelectItem key={titular} value={titular}>
                          {titular}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={FILTER_SELECT_WRAPPER_CLASS}>
                  <Select
                    value={filtroTipoCaja || "none"}
                    onValueChange={(v) => setFiltroTipoCaja(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="input-filtro-unificado">
                      <SelectValue placeholder="TIPO CAJA" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      <SelectItem value="none">TIPO CAJA</SelectItem>
                      {tiposCajaOptions.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={cn(FILTER_INLINE_ACTION_SLOT_CLASS, "col-span-2")}>
                  <LimpiarFiltrosButton visible={hayFiltros} onClick={limpiarFiltros} />
                </div>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
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
        <TablaTesoreriaCajas
          filas={filasFiltradas}
          esEditor={esEditor}
          onChequeRowClick={(fila) => setCajaCheques(fila)}
          onRowDoubleClick={esEditor ? (fila) => setCajaParaEditarMonto(fila) : undefined}
          onEditDataClick={esEditor ? (fila) => setCajaParaEditarDatos(fila) : undefined}
          onDeleteClick={esEditor ? (fila) => setCajaParaEliminar(fila) : undefined}
        />
        <ChequesCajaTesoreriaModal
          open={cajaCheques !== null}
          onOpenChange={(next) => {
            if (!next) setCajaCheques(null);
          }}
          caja={cajaCheques}
          esEditor={esEditor}
          onChequesChanged={() => router.refresh()}
        />
        <NuevaCajaTesoreriaModal
          open={openNuevaCaja}
          onOpenChange={setOpenNuevaCaja}
          onCreated={() => router.refresh()}
        />
        <ActualizarMontoCajaTesoreriaModal
          open={cajaParaEditarMonto != null}
          onOpenChange={(open) => {
            if (!open) setCajaParaEditarMonto(null);
          }}
          caja={cajaParaEditarMonto}
          onUpdated={() => router.refresh()}
        />
        <EditarCajaTesoreriaModal
          open={cajaParaEditarDatos != null}
          onOpenChange={(open) => {
            if (!open) setCajaParaEditarDatos(null);
          }}
          caja={cajaParaEditarDatos}
          onUpdated={() => router.refresh()}
        />
        <EliminarCajaTesoreriaModal
          open={cajaParaEliminar != null}
          onOpenChange={(open) => {
            if (!open) setCajaParaEliminar(null);
          }}
          caja={cajaParaEliminar}
          onDeleted={() => router.refresh()}
        />
      </ClassicFilteredTableLayout>
    </div>
  );
}
