"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearEnviosFinalAction, editarEnviosFinalAction } from "@/actions/envios";
import EnviosFechaHorarioCampos from "@/components/envios/EnviosFechaHorarioCampos";
import { leerPdfComprobante } from "@/components/envios/leerPdfComprobante";
import {
  ENVIOS_FORMA_PAGADO_LABELS,
  ENVIOS_FORMA_PAGADO_VALUES,
  esFormaPagadoEnvioValida,
  esHoraEnvioValida,
  pagadoDesdeFormaPagado,
  etiquetaDireccionEnvio,
  etiquetaSucursalEnvio,
  nombreCompletoCliente,
  type ClienteItem,
  type EnviosDireccionItem,
  type EnviosFinalListItem,
  type EnviosFormaPagadoValue,
  type EnviosHoraValue,
  type EnviosSucursalOption,
} from "@/lib/envios";
import { dateToIsoYmdArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";

const SENTINEL_NONE = "none";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  item?: EnviosFinalListItem | null;
  clientes: ClienteItem[];
  direcciones: EnviosDireccionItem[];
  sucursales: EnviosSucursalOption[];
  onSuccess?: () => void;
}

export default function CrearEditarEnvioFinalModal({
  open,
  onOpenChange,
  modo,
  item = null,
  clientes,
  direcciones,
  sucursales,
  onSuccess,
}: Props) {
  const [sucursalId, setSucursalId] = useState("");
  const [clienteFinalId, setClienteFinalId] = useState(SENTINEL_NONE);
  const [pintorId, setPintorId] = useState(SENTINEL_NONE);
  const [direccionId, setDireccionId] = useState("");
  const [fechaIso, setFechaIso] = useState("");
  const [horaDesde, setHoraDesde] = useState<EnviosHoraValue | "">("");
  const [horaHasta, setHoraHasta] = useState<EnviosHoraValue | "">("");
  const [observacionEnvio, setObservacionEnvio] = useState("");
  const [pagado, setPagado] = useState<"si" | "no">("no");
  const [formaPagado, setFormaPagado] = useState<EnviosFormaPagadoValue | "">("");
  const [pdfAdjunto, setPdfAdjunto] = useState<{ nombre: string; base64: string } | null>(null);
  const [quitarPdf, setQuitarPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  const clientesFinal = useMemo(
    () => clientes.filter((p) => p.tipo === "CONSUMIDOR_FINAL"),
    [clientes]
  );
  const pintores = useMemo(() => clientes.filter((p) => p.tipo === "PINTOR"), [clientes]);
  const direccionesFiltradas = useMemo(() => {
    const dueñoId =
      clienteFinalId !== SENTINEL_NONE
        ? clienteFinalId
        : pintorId !== SENTINEL_NONE
          ? pintorId
          : "";
    if (!dueñoId) return [];
    return direcciones.filter((d) => d.personaId === dueñoId);
  }, [direcciones, clienteFinalId, pintorId]);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setSucursalId(item.sucursal.id);
      setClienteFinalId(item.clienteFinal?.id ?? SENTINEL_NONE);
      setPintorId(item.pintor?.id ?? SENTINEL_NONE);
      setDireccionId(item.direccion.id);
      setFechaIso(item.fechaEnvioIso);
      setHoraDesde(esHoraEnvioValida(item.horaDesde) ? item.horaDesde : "");
      setHoraHasta(esHoraEnvioValida(item.horaHasta) ? item.horaHasta : "");
      setObservacionEnvio(item.observacionEnvio);
      setPagado(item.pagado ? "si" : "no");
      setFormaPagado(item.formaPagado);
      setPdfAdjunto(null);
      setQuitarPdf(false);
      return;
    }
    setSucursalId("");
    setClienteFinalId(SENTINEL_NONE);
    setPintorId(SENTINEL_NONE);
    setDireccionId("");
    setFechaIso(dateToIsoYmdArgentina(new Date()));
    setHoraDesde("");
    setHoraHasta("");
    setObservacionEnvio("");
    setPagado("no");
    setFormaPagado("");
    setPdfAdjunto(null);
    setQuitarPdf(false);
  }, [open, modo, item]);

  const tienePersona = clienteFinalId !== SENTINEL_NONE || pintorId !== SENTINEL_NONE;
  const horarioValido =
    esHoraEnvioValida(horaDesde) && esHoraEnvioValida(horaHasta) && horaDesde < horaHasta;
  const puedeGuardar =
    sucursalId !== "" &&
    tienePersona &&
    direccionId !== "" &&
    fechaIso !== "" &&
    horarioValido &&
    formaPagado !== "";
  const pdfActualNombre =
    modo === "editar" && item?.tienePdf && !quitarPdf && !pdfAdjunto ? item.pdfComprobanteNombre : null;

  async function handlePdfChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const parsed = await leerPdfComprobante(file);
    if (!parsed) return;
    setPdfAdjunto(parsed);
    setQuitarPdf(false);
  }

  async function handleSubmit() {
    if (!puedeGuardar || saving || !sucursalId) return;
    if (!esFormaPagadoEnvioValida(formaPagado)) {
      return;
    }
    if (!esHoraEnvioValida(horaDesde) || !esHoraEnvioValida(horaHasta)) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sucursalId,
        clienteFinalId: clienteFinalId === SENTINEL_NONE ? null : clienteFinalId,
        pintorId: pintorId === SENTINEL_NONE ? null : pintorId,
        direccionId,
        fechaEnvioIso: fechaIso,
        horaDesde,
        horaHasta,
        observacionEnvio,
        pagado: pagadoDesdeFormaPagado(formaPagado, pagado === "si"),
        formaPagado,
        ...(pdfAdjunto ? { pdfComprobante: pdfAdjunto } : {}),
      };
      if (modo === "editar" && item) {
        const res = await editarEnviosFinalAction({
          id: item.id,
          ...payload,
          quitarPdf: quitarPdf && !pdfAdjunto,
        });
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo guardar.");
          return;
        }
        toast.success("Envío actualizado.");
      } else {
        const res = await crearEnviosFinalAction(payload);
        if (!res.ok) {
          toast.error(res.error ?? "No se pudo crear.");
          return;
        }
        toast.success("Envío creado.");
      }
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <AppModal
        title={modo === "editar" ? "Editar Envío" : "Nuevo Envío"}
        size="lg"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving || !puedeGuardar} onClick={() => void handleSubmit()}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>SUCURSAL QUE ENVÍA</ModalMicroLabel>
            <Select value={sucursalId} onValueChange={setSucursalId} disabled={saving || sucursales.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="ELEGIR SUCURSAL..." />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {etiquetaSucursalEnvio(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>CLIENTE FINAL</ModalMicroLabel>
            <Select value={clienteFinalId} onValueChange={setClienteFinalId}>
              <SelectTrigger>
                <SelectValue placeholder="ELEGIR CLIENTE FINAL..." />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                <SelectItem value={SENTINEL_NONE}>SIN CLIENTE FINAL</SelectItem>
                {clientesFinal.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {nombreCompletoCliente(p)} · {p.cel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>PINTOR</ModalMicroLabel>
            <Select value={pintorId} onValueChange={setPintorId}>
              <SelectTrigger>
                <SelectValue placeholder="ELEGIR PINTOR..." />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                <SelectItem value={SENTINEL_NONE}>SIN PINTOR</SelectItem>
                {pintores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {nombreCompletoCliente(p)} · {p.cel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>DIRECCIÓN</ModalMicroLabel>
            <Select value={direccionId} onValueChange={setDireccionId}>
              <SelectTrigger>
                <SelectValue placeholder="ELEGIR DIRECCIÓN..." />
              </SelectTrigger>
              <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                {direccionesFiltradas.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {etiquetaDireccionEnvio(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <EnviosFechaHorarioCampos
            fechaIso={fechaIso}
            horaDesde={horaDesde}
            horaHasta={horaHasta}
            disabled={saving}
            onFechaChange={setFechaIso}
            onHoraDesdeChange={setHoraDesde}
            onHoraHastaChange={setHoraHasta}
          />
          <label className="flex flex-col gap-1">
            <ModalMicroLabel>OBSERVACIÓN ENVÍO</ModalMicroLabel>
            <textarea
              value={observacionEnvio}
              onChange={(e) => setObservacionEnvio(e.target.value)}
              rows={3}
              className={cn(
                "border-input min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-foreground outline-none",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>PAGADO</ModalMicroLabel>
              <Select value={pagado} onValueChange={(v) => setPagado(v as "si" | "no")}>
                <SelectTrigger>
                  <SelectValue placeholder="PAGADO..." />
                </SelectTrigger>
                <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                  <SelectItem value="no">NO</SelectItem>
                  <SelectItem value="si">SÍ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>FORMA PAGADO</ModalMicroLabel>
              <Select
                value={formaPagado}
                onValueChange={(v) => {
                  const forma = v as EnviosFormaPagadoValue;
                  setFormaPagado(forma);
                  if (forma === "PAGADO") setPagado("si");
                }}
              >
                <SelectTrigger>
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
          <div className="flex flex-col gap-2">
            <ModalMicroLabel>PDF COMPROBANTE</ModalMicroLabel>
            {pdfActualNombre ? (
              <p className="text-sm text-foreground">{pdfActualNombre}</p>
            ) : null}
            {pdfAdjunto ? (
              <p className="text-sm text-foreground">{pdfAdjunto.nombre}</p>
            ) : null}
            <Input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => void handlePdfChange(e.target.files)}
            />
            {modo === "editar" && item?.tienePdf && !quitarPdf ? (
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => {
                  setQuitarPdf(true);
                  setPdfAdjunto(null);
                }}
              >
                Quitar Pdf
              </Button>
            ) : null}
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
