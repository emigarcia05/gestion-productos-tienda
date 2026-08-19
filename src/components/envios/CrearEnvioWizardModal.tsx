"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import EnviosMapsLink from "@/components/envios/EnviosMapsLink";
import EnviosTelLink from "@/components/envios/EnviosTelLink";
import EnviosPintorConsumidoresButton from "@/components/envios/EnviosPintorConsumidoresButton";
import EnviosConsumidoresDePintorModal from "@/components/envios/EnviosConsumidoresDePintorModal";
import EnviosFechaHorarioCampos from "@/components/envios/EnviosFechaHorarioCampos";
import EnviosWizardPasos, {
  type EnvioWizardPaso,
} from "@/components/envios/EnviosWizardPasos";
import CrearEditarEnviosDireccionModal from "@/components/envios/CrearEditarEnviosDireccionModal";
import CrearEditarClienteModal from "@/components/envios/CrearEditarClienteModal";
import { leerPdfComprobante } from "@/components/envios/leerPdfComprobante";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import ModalSiNoChoice from "@/components/shared/ModalSiNoChoice";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearEnviosFinalAction, eliminarClienteAction, eliminarEnviosDireccionAction } from "@/actions/envios";
import { matchByMultiTerm } from "@/lib/busqueda";
import {
  ENVIOS_FORMA_PAGADO_LABELS,
  ENVIOS_FORMA_PAGADO_VALUES,
  esHoraEnvioValida,
  etiquetaDepartamentoEnvio,
  etiquetaDireccionEnvio,
  etiquetaSucursalEnvio,
  metaDireccionEnvio,
  nombreCompletoCliente,
  nombrePintorAsociadoCliente,
  type ClienteItem,
  type EnviosDireccionItem,
  type EnviosFormaPagadoValue,
  type EnviosHoraValue,
  type EnviosSucursalOption,
} from "@/lib/envios";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientesCatalogo: ClienteItem[];
  direcciones: EnviosDireccionItem[];
  sucursales: EnviosSucursalOption[];
  onCatalogoChanged: () => void;
  onSuccess: () => void;
}

export default function CrearEnvioWizardModal({
  open,
  onOpenChange,
  clientesCatalogo,
  direcciones,
  sucursales,
  onCatalogoChanged,
  onSuccess,
}: Props) {
  const [paso, setPaso] = useState<EnvioWizardPaso>(1);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [direccionId, setDireccionId] = useState<string | null>(null);
  const [fechaIso, setFechaIso] = useState(() => dateToIsoYmdArgentina(new Date()));
  const [horaDesde, setHoraDesde] = useState<EnviosHoraValue | "">("");
  const [horaHasta, setHoraHasta] = useState<EnviosHoraValue | "">("");
  const [pagado, setPagado] = useState(false);
  const [formaPagado, setFormaPagado] = useState<EnviosFormaPagadoValue | "">("");
  const [pdfAdjunto, setPdfAdjunto] = useState<{ nombre: string; base64: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [qClienteDebounced, setQClienteDebounced] = useState("");
  const [qDireccionDebounced, setQDireccionDebounced] = useState("");
  const busquedaCliente = useFiltrosConBusqueda({
    qActual: qClienteDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQClienteDebounced,
  });
  const busquedaDireccion = useFiltrosConBusqueda({
    qActual: qDireccionDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQDireccionDebounced,
  });
  const [modalCliente, setModalCliente] = useState<
    { open: false } | { open: true; modo: "crear" | "editar"; item?: ClienteItem }
  >({ open: false });
  const [modalDireccion, setModalDireccion] = useState<
    { open: false } | { open: true; modo: "crear" | "editar"; item?: EnviosDireccionItem }
  >({ open: false });
  const [modalEliminar, setModalEliminar] = useState<
    { open: false } | { open: true; kind: "cliente" | "direccion"; id: string; label: string }
  >({ open: false });
  const [pintorConsumidores, setPintorConsumidores] = useState<ClienteItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaso(1);
    setSucursalId(null);
    setClienteId(null);
    setDireccionId(null);
    setFechaIso(dateToIsoYmdArgentina(new Date()));
    setHoraDesde("");
    setHoraHasta("");
    setPagado(false);
    setFormaPagado("");
    setPdfAdjunto(null);
    setQClienteDebounced("");
    setQDireccionDebounced("");
    setModalCliente({ open: false });
    setModalDireccion({ open: false });
    setModalEliminar({ open: false });
    setPintorConsumidores(null);
  }, [open]);

  const pintores = useMemo(
    () => clientesCatalogo.filter((c) => c.tipo === "PINTOR"),
    [clientesCatalogo]
  );
  const consumidoresFinales = useMemo(
    () => clientesCatalogo.filter((c) => c.tipo === "CONSUMIDOR_FINAL"),
    [clientesCatalogo]
  );

  const clientesFiltrados = useMemo(() => {
    if (!qClienteDebounced.trim()) return clientesCatalogo;
    return clientesCatalogo.filter((item) =>
      matchByMultiTerm(
        [item.nombreCompleto, item.cel, item.pintorAsociado?.nombreCompleto ?? ""],
        qClienteDebounced
      )
    );
  }, [clientesCatalogo, qClienteDebounced]);

  const clienteSeleccionado = useMemo(
    () => clientesCatalogo.find((c) => c.id === clienteId) ?? null,
    [clientesCatalogo, clienteId]
  );

  const consumidoresDelPintor = useMemo(() => {
    if (!pintorConsumidores) return [];
    return consumidoresFinales.filter((c) => c.pintorAsociadoId === pintorConsumidores.id);
  }, [consumidoresFinales, pintorConsumidores]);

  const direccionesDelCliente = useMemo(() => {
    if (!clienteId) return [];
    return direcciones.filter((d) => d.personaId === clienteId);
  }, [direcciones, clienteId]);

  const direccionesFiltradas = useMemo(() => {
    if (!qDireccionDebounced.trim()) return direccionesDelCliente;
    return direccionesDelCliente.filter((item) =>
      matchByMultiTerm(
        [
          item.calleNombre,
          item.numeracion,
          item.distrito,
          etiquetaDepartamentoEnvio(item.departamento),
          item.referencia,
          item.urlMaps,
        ],
        qDireccionDebounced
      )
    );
  }, [direccionesDelCliente, qDireccionDebounced]);

  const horarioValido =
    fechaIso !== "" &&
    esHoraEnvioValida(horaDesde) &&
    esHoraEnvioValida(horaHasta) &&
    horaDesde < horaHasta;
  const pasoSucursalOk = Boolean(sucursalId);
  const pasoClienteOk = Boolean(clienteId);
  const pasoDireccionOk = Boolean(direccionId);
  const puedeCrear =
    pasoSucursalOk && pasoClienteOk && pasoDireccionOk && horarioValido && formaPagado !== "";

  const pasoMaximoAlcanzable: EnvioWizardPaso = horarioValido && pasoDireccionOk
    ? 5
    : pasoDireccionOk
      ? 4
      : pasoClienteOk
        ? 3
        : pasoSucursalOk
          ? 2
          : 1;

  function handleSelectSucursal(id: string) {
    setSucursalId(id);
    setPaso(2);
  }

  function handleSelectCliente(id: string) {
    setClienteId(id);
    setDireccionId(null);
    busquedaDireccion.setQ("");
    setQDireccionDebounced("");
    setPaso(3);
  }

  function handleSelectDireccion(id: string) {
    setDireccionId(id);
    setPaso(4);
  }

  function handleCerrar() {
    if (saving) return;
    onOpenChange(false);
  }

  function handleSiguiente() {
    if (paso === 1 && pasoSucursalOk) setPaso(2);
    else if (paso === 2 && pasoClienteOk) setPaso(3);
    else if (paso === 3 && pasoDireccionOk) setPaso(4);
    else if (paso === 4 && horarioValido) setPaso(5);
  }

  function handleAtras() {
    if (paso === 1) return;
    setPaso((prev) => (prev - 1) as EnvioWizardPaso);
  }

  async function handlePdfChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const parsed = await leerPdfComprobante(file);
    if (!parsed) return;
    setPdfAdjunto(parsed);
  }

  async function handleEliminar() {
    if (!modalEliminar.open || deleting) return;
    setDeleting(true);
    try {
      const res =
        modalEliminar.kind === "cliente"
          ? await eliminarClienteAction({ id: modalEliminar.id })
          : await eliminarEnviosDireccionAction({ id: modalEliminar.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success(modalEliminar.kind === "cliente" ? "Cliente eliminado." : "Dirección eliminada.");
      if (modalEliminar.kind === "cliente" && clienteId === modalEliminar.id) {
        setClienteId(null);
        setDireccionId(null);
        setPaso(2);
      }
      if (modalEliminar.kind === "direccion" && direccionId === modalEliminar.id) {
        setDireccionId(null);
      }
      setModalEliminar({ open: false });
      onCatalogoChanged();
    } finally {
      setDeleting(false);
    }
  }

  async function handleCrearEnvio() {
    if (!puedeCrear || saving || !sucursalId || !clienteId || !direccionId) return;
    if (
      !esHoraEnvioValida(horaDesde) ||
      !esHoraEnvioValida(horaHasta) ||
      (formaPagado !== "EFECTIVO" &&
        formaPagado !== "TRANSFERENCIA" &&
        formaPagado !== "POSNET" &&
        formaPagado !== "CUENTA_CORRIENTE")
    ) {
      return;
    }
    setSaving(true);
    try {
      const esPintor = clienteSeleccionado?.tipo === "PINTOR";
      const res = await crearEnviosFinalAction({
        sucursalId,
        clienteFinalId: esPintor ? null : clienteId,
        pintorId: esPintor ? clienteId : (clienteSeleccionado?.pintorAsociadoId ?? null),
        direccionId,
        fechaEnvioIso: fechaIso,
        horaDesde,
        horaHasta,
        observacionEnvio: "",
        pagado,
        formaPagado,
        ...(pdfAdjunto ? { pdfComprobante: pdfAdjunto } : {}),
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear el envío.");
        return;
      }
      toast.success("Envío creado.");
      onOpenChange(false);
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  const puedeSiguiente =
    (paso === 1 && pasoSucursalOk) ||
    (paso === 2 && pasoClienteOk) ||
    (paso === 3 && pasoDireccionOk) ||
    (paso === 4 && horarioValido);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleCerrar();
        }}
      >
        <AppModal
          title="Nuevo Envío"
          size="xl"
          scrollBody={false}
          padding="sm"
          className="h-[85vh] max-h-[85vh]"
          bodyShellClassName="h-full min-h-0"
          bodyClassName="flex h-full min-h-0 flex-col overflow-hidden p-0"
          actions={
            <div className="flex w-full items-center justify-between gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={handleCerrar}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {paso > 1 ? (
                  <Button type="button" variant="outline" disabled={saving} onClick={handleAtras}>
                    Atrás
                  </Button>
                ) : null}
                {paso < 5 ? (
                  <Button type="button" disabled={saving || !puedeSiguiente} onClick={handleSiguiente}>
                    Siguiente
                  </Button>
                ) : (
                  <Button type="button" disabled={saving || !puedeCrear} onClick={() => void handleCrearEnvio()}>
                    {saving ? "Creando Envío..." : "Crear Envío"}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="h-[15%] shrink-0 border-b border-border p-3">
              <EnviosWizardPasos
                pasoActual={paso}
                pasoMaximoAlcanzable={pasoMaximoAlcanzable}
                onPasoChange={setPaso}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {paso === 1 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
                  <div className="flex w-full flex-col items-center gap-4">
                    <ModalMicroLabel align="center">SUCURSAL QUE ENVÍA</ModalMicroLabel>
                    {sucursales.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay sucursales habilitadas para envíos.
                      </p>
                    ) : (
                      <div className="flex w-full flex-col gap-2">
                        {sucursales.map((item) => (
                          <Button
                            key={item.id}
                            type="button"
                            variant={sucursalId === item.id ? "default" : "outline"}
                            className="h-10 w-full"
                            disabled={saving}
                            onClick={() => handleSelectSucursal(item.id)}
                          >
                            {etiquetaSucursalEnvio(item)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : paso === 2 ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4">
                    <CatalogoFinderColumn
                      titulo="CLIENTES"
                      subtitulo={`${clientesFiltrados.length} cliente(s)`}
                      mostrarNuevo={false}
                      headerVariant="titulo"
                      className="h-full min-h-0 flex-1"
                    >
                      <div className="sticky top-0 z-10 border-b border-border bg-card p-2">
                        <FiltroBusquedaInput
                          id="filtro-envios-wizard-clientes"
                          placeholder="BUSCAR CLIENTE..."
                          value={busquedaCliente.q}
                          onChange={busquedaCliente.handleQChange}
                          isDebouncing={busquedaCliente.isDebouncing}
                          inputRef={busquedaCliente.ref}
                        />
                      </div>
                      {clientesCatalogo.length === 0 ? (
                        <CatalogoFinderEmpty mensaje="No hay clientes. Usá + para crear el primero." />
                      ) : clientesFiltrados.length === 0 ? (
                        <CatalogoFinderEmpty mensaje="Ningún cliente coincide con la búsqueda." />
                      ) : (
                        clientesFiltrados.map((item) => (
                          <CatalogoFinderRow
                            key={item.id}
                            nombre={nombreCompletoCliente(item)}
                            nombreSufijo={nombrePintorAsociadoCliente(item) ?? undefined}
                            nombreCentrado
                            nombreAccion={
                              item.tipo === "PINTOR" || item.cel.trim() ? (
                                <span className="flex shrink-0 items-center gap-1">
                                  {item.tipo === "PINTOR" ? (
                                    <EnviosPintorConsumidoresButton
                                      pintorNombre={nombreCompletoCliente(item)}
                                      onClick={() => setPintorConsumidores(item)}
                                    />
                                  ) : null}
                                  {item.cel.trim() ? <EnviosTelLink cel={item.cel} /> : null}
                                </span>
                              ) : undefined
                            }
                            selected={item.id === clienteId}
                            onClick={() => handleSelectCliente(item.id)}
                            mostrarAcciones
                            eliminarSiempreVisible
                            onEditar={() => setModalCliente({ open: true, modo: "editar", item })}
                            onEliminar={() =>
                              setModalEliminar({
                                open: true,
                                kind: "cliente",
                                id: item.id,
                                label: nombreCompletoCliente(item),
                              })
                            }
                          />
                        ))
                      )}
                    </CatalogoFinderColumn>
                  </div>
                  <Button
                    type="button"
                    className="h-10 w-full shrink-0 rounded-none"
                    title="Nuevo"
                    aria-label="Nuevo Cliente"
                    onClick={() => setModalCliente({ open: true, modo: "crear" })}
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Nuevo Cliente
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              {paso === 3 ? (
                <CatalogoFinderColumn
                  titulo="DIRECCIONES"
                  subtitulo={
                    clienteSeleccionado
                      ? nombreCompletoCliente(clienteSeleccionado)
                      : "Seleccioná un cliente"
                  }
                  mostrarNuevo={Boolean(clienteSeleccionado)}
                  deshabilitada={!clienteSeleccionado}
                  headerVariant="titulo"
                  className="h-full min-h-0 flex-1"
                  onNuevo={() => {
                    if (!clienteSeleccionado) return;
                    setModalDireccion({ open: true, modo: "crear" });
                  }}
                >
                  {!clienteSeleccionado ? (
                    <CatalogoFinderEmpty mensaje="Seleccioná un cliente para ver sus direcciones." />
                  ) : (
                    <>
                      <div className="sticky top-0 z-10 border-b border-border bg-card p-2">
                        <FiltroBusquedaInput
                          id="filtro-envios-wizard-direcciones"
                          placeholder="BUSCAR DIRECCIÓN..."
                          value={busquedaDireccion.q}
                          onChange={busquedaDireccion.handleQChange}
                          isDebouncing={busquedaDireccion.isDebouncing}
                          inputRef={busquedaDireccion.ref}
                        />
                      </div>
                      {direccionesDelCliente.length === 0 ? (
                        <CatalogoFinderEmpty mensaje="No hay direcciones. Usá + para crear la primera." />
                      ) : direccionesFiltradas.length === 0 ? (
                        <CatalogoFinderEmpty mensaje="Ninguna dirección coincide con la búsqueda." />
                      ) : (
                        direccionesFiltradas.map((item) => (
                          <CatalogoFinderRow
                            key={item.id}
                            nombre={etiquetaDireccionEnvio(item)}
                            meta={metaDireccionEnvio(item) || undefined}
                            nombreAccion={
                              item.urlMaps ? <EnviosMapsLink url={item.urlMaps} /> : undefined
                            }
                            selected={item.id === direccionId}
                            onClick={() => handleSelectDireccion(item.id)}
                            mostrarAcciones
                            onEditar={() => setModalDireccion({ open: true, modo: "editar", item })}
                            onEliminar={() =>
                              setModalEliminar({
                                open: true,
                                kind: "direccion",
                                id: item.id,
                                label: etiquetaDireccionEnvio(item),
                              })
                            }
                          />
                        ))
                      )}
                    </>
                  )}
                </CatalogoFinderColumn>
              ) : null}

              {paso === 4 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
                  <EnviosFechaHorarioCampos
                    fechaIso={fechaIso}
                    horaDesde={horaDesde}
                    horaHasta={horaHasta}
                    disabled={saving}
                    onFechaChange={setFechaIso}
                    onHoraDesdeChange={setHoraDesde}
                    onHoraHastaChange={setHoraHasta}
                    onCompleto={() => setPaso(5)}
                  />
                </div>
              ) : null}

              {paso === 5 ? (
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
                  <div className="flex flex-col gap-2">
                    <ModalMicroLabel>PDF MERCADERÍA</ModalMicroLabel>
                    {pdfAdjunto ? (
                      <p className="text-sm text-foreground">{pdfAdjunto.nombre}</p>
                    ) : null}
                    <Input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={saving}
                      onChange={(e) => void handlePdfChange(e.target.files)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <ModalMicroLabel>PAGADO</ModalMicroLabel>
                    <ModalSiNoChoice value={pagado} onChange={setPagado} disabled={saving} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <ModalMicroLabel>FORMA DE PAGO</ModalMicroLabel>
                    <Select
                      value={formaPagado || undefined}
                      disabled={saving}
                      onValueChange={(v) => setFormaPagado(v as EnviosFormaPagadoValue)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ELEGIR FORMA..." />
                      </SelectTrigger>
                      <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                        {ENVIOS_FORMA_PAGADO_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {ENVIOS_FORMA_PAGADO_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
                </div>
              )}
            </div>
          </div>
        </AppModal>
      </Dialog>

      <EnviosConsumidoresDePintorModal
        open={pintorConsumidores != null}
        onOpenChange={(next) => {
          if (!next) setPintorConsumidores(null);
        }}
        pintor={pintorConsumidores}
        consumidores={consumidoresDelPintor}
        onSelect={(item) => {
          handleSelectCliente(item.id);
          setPintorConsumidores(null);
        }}
      />
      <CrearEditarClienteModal
        open={modalCliente.open}
        onOpenChange={(next) => {
          if (!next) setModalCliente({ open: false });
        }}
        modo={modalCliente.open ? modalCliente.modo : "crear"}
        item={modalCliente.open ? modalCliente.item : null}
        pintores={pintores}
        direcciones={direcciones}
        onCatalogoChanged={onCatalogoChanged}
        onSuccess={(item) => {
          handleSelectCliente(item.id);
          onCatalogoChanged();
        }}
      />
      <CrearEditarEnviosDireccionModal
        open={modalDireccion.open}
        onOpenChange={(next) => {
          if (!next) setModalDireccion({ open: false });
        }}
        modo={modalDireccion.open ? modalDireccion.modo : "crear"}
        personaId={clienteId ?? ""}
        item={modalDireccion.open ? modalDireccion.item : null}
        onSuccess={(item) => {
          setDireccionId(item.id);
          onCatalogoChanged();
        }}
      />
      <Dialog
        open={modalEliminar.open}
        onOpenChange={(next) => {
          if (!next && !deleting) setModalEliminar({ open: false });
        }}
      >
        <AppModal
          title={modalEliminar.open && modalEliminar.kind === "cliente" ? "Eliminar Cliente" : "Eliminar Dirección"}
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
            ¿Eliminar {modalEliminar.open ? modalEliminar.label : ""}?
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
