"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEditarEnvioFinalModal from "@/components/envios/CrearEditarEnvioFinalModal";
import FilterBar, {
  FILTER_COUNT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  FiltroIndividualContainer,
  FilaFiltrosDesplegables,
  FilterRowSearch,
  LimpiarFiltrosButton,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { eliminarEnviosFinalAction } from "@/actions/envios";
import { matchByMultiTerm } from "@/lib/busqueda";
import {
  ENVIOS_FORMA_PAGADO_LABELS,
  ENVIOS_FORMA_PAGADO_VALUES,
  etiquetaDepartamentoEnvio,
  etiquetaDireccionEnvio,
  etiquetaFormaPagadoEnvio,
  etiquetaHorarioEnvio,
  etiquetaSucursalEnvio,
  nombreCompletoCliente,
  type ClienteItem,
  type EnviosDireccionItem,
  type EnviosFinalListItem,
  type EnviosSucursalOption,
} from "@/lib/envios";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { fmtCelda } from "@/lib/format";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const FILTRO_TODOS = "__todos__";

interface Props {
  envios: EnviosFinalListItem[];
  clientes: ClienteItem[];
  direcciones: EnviosDireccionItem[];
  sucursales: EnviosSucursalOption[];
}

export default function EnviosPageClient({ envios, clientes, direcciones, sucursales }: Props) {
  const router = useRouter();
  const [filtroSucursal, setFiltroSucursal] = useState(FILTRO_TODOS);
  const [filtroPagado, setFiltroPagado] = useState(FILTRO_TODOS);
  const [filtroForma, setFiltroForma] = useState(FILTRO_TODOS);
  const [qDebounced, setQDebounced] = useState("");
  const { q, setQ, handleQChange, isDebouncing, ref: searchRef } = useFiltrosConBusqueda({
    qActual: qDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQDebounced,
  });
  const [modalForm, setModalForm] = useState<
    { open: false } | { open: true; item: EnviosFinalListItem }
  >({ open: false });
  const [modalEliminar, setModalEliminar] = useState<
    { open: false } | { open: true; id: string; label: string }
  >({ open: false });
  const [deleting, setDeleting] = useState(false);

  const itemsFiltrados = useMemo(() => {
    return envios.filter((item) => {
      if (filtroSucursal !== FILTRO_TODOS && item.sucursal.id !== filtroSucursal) return false;
      if (filtroPagado === "si" && !item.pagado) return false;
      if (filtroPagado === "no" && item.pagado) return false;
      if (filtroForma !== FILTRO_TODOS && item.formaPagado !== filtroForma) return false;
      if (
        qDebounced.trim() &&
        !matchByMultiTerm(
          [
            etiquetaSucursalEnvio(item.sucursal),
            item.clienteFinal ? nombreCompletoCliente(item.clienteFinal) : "",
            item.clienteFinal?.cel ?? "",
            item.pintor ? nombreCompletoCliente(item.pintor) : "",
            item.pintor?.cel ?? "",
            etiquetaDireccionEnvio(item.direccion),
            item.direccion.distrito,
            etiquetaDepartamentoEnvio(item.direccion.departamento),
            item.direccion.referencia,
            item.observacionEnvio,
            etiquetaFormaPagadoEnvio(item.formaPagado),
            formatIsoYmdDdMmYyyyArgentina(item.fechaEnvioIso),
            etiquetaHorarioEnvio(item.horaDesde, item.horaHasta),
          ],
          qDebounced
        )
      ) {
        return false;
      }
      return true;
    });
  }, [envios, filtroSucursal, filtroPagado, filtroForma, qDebounced]);

  function limpiarFiltros() {
    setFiltroSucursal(FILTRO_TODOS);
    setFiltroPagado(FILTRO_TODOS);
    setFiltroForma(FILTRO_TODOS);
    setQ("");
    setQDebounced("");
  }

  function refresh() {
    router.refresh();
  }

  async function handleEliminar() {
    if (!modalEliminar.open || deleting) return;
    setDeleting(true);
    try {
      const res = await eliminarEnviosFinalAction({ id: modalEliminar.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Envío eliminado.");
      setModalEliminar({ open: false });
      refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Envios"
        subtitle="Programados"
        contentWidth="full"
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilaFiltrosDesplegables columnas={4}>
              <FiltroIndividualContainer
                activo={filtroSucursal !== FILTRO_TODOS}
                onLimpiar={() => setFiltroSucursal(FILTRO_TODOS)}
                className={FILTER_SELECT_WRAPPER_CLASS}
              >
                <Select
                  value={filtroSucursal === FILTRO_TODOS ? "" : filtroSucursal}
                  onValueChange={setFiltroSucursal}
                >
                  <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                    <SelectValue placeholder="SUCURSAL" />
                  </SelectTrigger>
                  <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {etiquetaSucursalEnvio(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <FiltroIndividualContainer
                activo={filtroPagado !== FILTRO_TODOS}
                onLimpiar={() => setFiltroPagado(FILTRO_TODOS)}
                className={FILTER_SELECT_WRAPPER_CLASS}
              >
                <Select
                  value={filtroPagado === FILTRO_TODOS ? "" : filtroPagado}
                  onValueChange={setFiltroPagado}
                >
                  <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                    <SelectValue placeholder="PAGADO" />
                  </SelectTrigger>
                  <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                    <SelectItem value="si">SÍ</SelectItem>
                    <SelectItem value="no">NO</SelectItem>
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
              <FiltroIndividualContainer
                activo={filtroForma !== FILTRO_TODOS}
                onLimpiar={() => setFiltroForma(FILTRO_TODOS)}
                className={FILTER_SELECT_WRAPPER_CLASS}
              >
                <Select
                  value={filtroForma === FILTRO_TODOS ? "" : filtroForma}
                  onValueChange={setFiltroForma}
                >
                  <SelectTrigger className={SELECT_TRIGGER_FILTER_CLASS}>
                    <SelectValue placeholder="FORMA PAGADO" />
                  </SelectTrigger>
                  <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                    {ENVIOS_FORMA_PAGADO_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ENVIOS_FORMA_PAGADO_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FiltroIndividualContainer>
            </FilaFiltrosDesplegables>
            <div className="flex items-center gap-3">
              <FilterRowSearch className="flex-1">
                <FiltroBusquedaInput
                  id="filtro-envios-busqueda"
                  placeholder="BUSCAR POR SUCURSAL, PERSONA, DIRECCIÓN U OBSERVACIÓN..."
                  value={q}
                  onChange={handleQChange}
                  isDebouncing={isDebouncing}
                  inputRef={searchRef}
                />
              </FilterRowSearch>
              <LimpiarFiltrosButton onClick={limpiarFiltros} />
              <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
                {itemsFiltrados.length.toLocaleString("es-AR")} ENVÍO
                {itemsFiltrados.length === 1 ? "" : "S"}
              </span>
            </div>
          </FilterBar>
        }
      >
        <div className="contenedor-tabla-gestion min-h-0 flex-1">
          <Table variant="compact" className="tabla-gestion-compacta w-full">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[5%]" />
              <col className="w-[9%]" />
              <col className="w-[5%]" />
              <col className="w-[9%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>SUCURSAL</TableHead>
                <TableHead>CLIENTE FINAL</TableHead>
                <TableHead>PINTOR</TableHead>
                <TableHead>FECHA</TableHead>
                <TableHead>HORARIO</TableHead>
                <TableHead>DIRECCIÓN</TableHead>
                <TableHead>OBSERVACIÓN</TableHead>
                <TableHead className="text-center">
                  <Check className={TABLE_ROW_ACTION_ICON_CLASS} aria-label="PAGADO" />
                </TableHead>
                <TableHead>FORMA PAGADO</TableHead>
                <TableHead className="text-center">PDF</TableHead>
                <TableHead className="tabla-bloque-secundario-head-divider text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsFiltrados.length === 0 ? (
                <EmptyTableRow
                  colSpan={11}
                  message={
                    envios.length === 0
                      ? "NO HAY ENVÍOS."
                      : "NO HAY ENVÍOS CON LOS FILTROS APLICADOS."
                  }
                />
              ) : (
                itemsFiltrados.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="celda-datos">
                      {etiquetaSucursalEnvio(item.sucursal)}
                    </TableCell>
                    <TableCell className="celda-datos">
                      {item.clienteFinal
                        ? nombreCompletoCliente(item.clienteFinal)
                        : fmtCelda("")}
                    </TableCell>
                    <TableCell className="celda-datos">
                      {item.pintor ? nombreCompletoCliente(item.pintor) : fmtCelda("")}
                    </TableCell>
                    <TableCell className="celda-datos tabular-nums">
                      {formatIsoYmdDdMmYyyyArgentina(item.fechaEnvioIso)}
                    </TableCell>
                    <TableCell className="celda-datos tabular-nums">
                      {etiquetaHorarioEnvio(item.horaDesde, item.horaHasta)}
                    </TableCell>
                    <TableCell className="celda-datos">
                      {etiquetaDireccionEnvio(item.direccion)}
                    </TableCell>
                    <TableCell className="celda-datos">{fmtCelda(item.observacionEnvio)}</TableCell>
                    <TableCell className="celda-datos text-center">
                      <div className="flex w-full items-center justify-center">
                        <span
                          className={cn(
                            "tabla-check-toggle",
                            item.pagado && "border-primary !bg-primary !text-primary-foreground"
                          )}
                          aria-label={item.pagado ? "Pagado" : "No pagado"}
                          role="img"
                        >
                          {item.pagado ? <Check aria-hidden="true" /> : null}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="celda-datos">
                      {etiquetaFormaPagadoEnvio(item.formaPagado)}
                    </TableCell>
                    <TableCell className="celda-datos text-center">
                      {item.tienePdf ? (
                        <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            title="Ver Pdf"
                            aria-label="Ver comprobante PDF"
                            onClick={() => {
                              window.open(`/api/envios/${item.id}/comprobante`, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <FileText className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                          </Button>
                        </div>
                      ) : (
                        fmtCelda("")
                      )}
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila tabla-bloque-secundario-cell-divider">
                      <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          title="Editar"
                          aria-label="Editar envío"
                          onClick={() => setModalForm({ open: true, item })}
                        >
                          <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          title="Eliminar"
                          aria-label="Eliminar envío"
                          onClick={() =>
                            setModalEliminar({
                              open: true,
                              id: item.id,
                              label: etiquetaDireccionEnvio(item.direccion),
                            })
                          }
                        >
                          <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ClassicFilteredTableLayout>

      <CrearEditarEnvioFinalModal
        open={modalForm.open}
        onOpenChange={(open) => {
          if (!open) setModalForm({ open: false });
        }}
        modo="editar"
        item={modalForm.open ? modalForm.item : null}
        clientes={clientes}
        direcciones={direcciones}
        sucursales={sucursales}
        onSuccess={refresh}
      />
      <Dialog
        open={modalEliminar.open}
        onOpenChange={(open) => {
          if (!open && !deleting) setModalEliminar({ open: false });
        }}
      >
        <AppModal
          title="Eliminar Envío"
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setModalEliminar({ open: false })}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={deleting} onClick={() => void handleEliminar()}>
                Eliminar
              </Button>
            </div>
          }
        >
          <p className="text-sm text-foreground">
            ¿Eliminar el envío a {modalEliminar.open ? modalEliminar.label : ""}?
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
