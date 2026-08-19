"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import SeleccionarPintorModal from "@/components/envios/SeleccionarPintorModal";
import { crearClienteAction, editarClienteAction } from "@/actions/envios";
import {
  CLIENTE_TIPO_LABELS,
  CLIENTE_TIPO_VALUES,
  nombreCompletoCliente,
  type ClienteItem,
  type ClienteTipoValue,
} from "@/lib/envios";
import {
  CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS,
  TABLE_ROW_ACTION_ICON_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  item?: ClienteItem | null;
  /** Si está definido, el tipo no se elige en el formulario. */
  tipoFijo?: ClienteTipoValue;
  pintores?: ClienteItem[];
  onSuccess?: (item: ClienteItem) => void;
  onCatalogoChanged?: () => void;
}

export default function CrearEditarClienteModal({
  open,
  onOpenChange,
  modo,
  item = null,
  tipoFijo,
  pintores = [],
  onSuccess,
  onCatalogoChanged,
}: Props) {
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cel, setCel] = useState("");
  const [tipo, setTipo] = useState<ClienteTipoValue>(tipoFijo ?? "CONSUMIDOR_FINAL");
  const [pintorAsociadoId, setPintorAsociadoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalListaPintores, setModalListaPintores] = useState(false);
  const [modalFormPintor, setModalFormPintor] = useState<
    { open: false } | { open: true; modo: "crear" | "editar"; item?: ClienteItem }
  >({ open: false });

  const tipoEfectivo = tipoFijo ?? tipo;
  const muestraPintorAsociado = tipoEfectivo === "CONSUMIDOR_FINAL";

  const pintoresDisponibles = useMemo(
    () => pintores.filter((p) => p.tipo === "PINTOR" && p.id !== item?.id),
    [pintores, item?.id]
  );

  const pintorAsociado = useMemo(() => {
    if (!pintorAsociadoId) return null;
    return (
      pintoresDisponibles.find((p) => p.id === pintorAsociadoId) ??
      (item?.pintorAsociado?.id === pintorAsociadoId ? item.pintorAsociado : null)
    );
  }, [pintorAsociadoId, pintoresDisponibles, item?.pintorAsociado]);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setNombreCompleto(item.nombreCompleto);
      setCel(item.cel);
      setTipo(tipoFijo ?? item.tipo);
      setPintorAsociadoId(item.pintorAsociadoId);
      return;
    }
    setNombreCompleto("");
    setCel("");
    setTipo(tipoFijo ?? "CONSUMIDOR_FINAL");
    setPintorAsociadoId(null);
  }, [open, modo, item, tipoFijo]);

  const puedeGuardar = nombreCompleto.trim() !== "" && cel.trim() !== "";
  const tituloBase = tipoFijo === "PINTOR" || tipoEfectivo === "PINTOR" ? "Pintor" : "Cliente";

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    const tipoGuardar = tipoFijo ?? tipo;
    setSaving(true);
    try {
      const payload = {
        nombreCompleto,
        cel,
        tipo: tipoGuardar,
        pintorAsociadoId: tipoGuardar === "CONSUMIDOR_FINAL" ? pintorAsociadoId : null,
      };
      const res =
        modo === "editar" && item
          ? await editarClienteAction({ id: item.id, ...payload })
          : await crearClienteAction(payload);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "editar" ? `${tituloBase} actualizado.` : `${tituloBase} creado.`);
      onOpenChange(false);
      onSuccess?.(res.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
        <AppModal
          title={modo === "editar" ? `Editar ${tituloBase}` : `Nuevo ${tituloBase}`}
          size="md"
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
            <label className="flex flex-col gap-1">
              <ModalMicroLabel>NOMBRE COMPLETO</ModalMicroLabel>
              <Input
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1">
              <ModalMicroLabel>CEL</ModalMicroLabel>
              <Input value={cel} onChange={(e) => setCel(e.target.value)} autoComplete="off" />
            </label>
            {tipoFijo ? null : (
              <div className="flex flex-col gap-1">
                <ModalMicroLabel>TIPO</ModalMicroLabel>
                <Select
                  value={tipo}
                  onValueChange={(v) => {
                    const next = v as ClienteTipoValue;
                    setTipo(next);
                    if (next === "PINTOR") setPintorAsociadoId(null);
                  }}
                >
                  <SelectTrigger className={cn("w-full")}>
                    <SelectValue placeholder="ELEGIR TIPO..." />
                  </SelectTrigger>
                  <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                    {CLIENTE_TIPO_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {CLIENTE_TIPO_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {muestraPintorAsociado ? (
              <div className="flex flex-col gap-2">
                <ModalMicroLabel>PINTOR ASOCIADO</ModalMicroLabel>
                {pintorAsociado ? (
                  <div
                    className={cn(
                      "flex min-h-9 items-center gap-2 rounded-md border border-input px-3 py-1"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {nombreCompletoCliente(pintorAsociado)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS}
                        title="Editar"
                        aria-label={`Editar ${nombreCompletoCliente(pintorAsociado)}`}
                        disabled={saving}
                        onClick={() => {
                          const pintorItem =
                            pintoresDisponibles.find((p) => p.id === pintorAsociado.id) ??
                            (item?.pintorAsociado?.id === pintorAsociado.id
                              ? {
                                  ...item.pintorAsociado,
                                  pintorAsociadoId: null,
                                  pintorAsociado: null,
                                }
                              : null);
                          if (!pintorItem) return;
                          setModalFormPintor({ open: true, modo: "editar", item: pintorItem });
                        }}
                      >
                        <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS}
                        title="Borrar"
                        aria-label={`Quitar pintor asociado ${nombreCompletoCliente(pintorAsociado)}`}
                        disabled={saving}
                        onClick={() => setPintorAsociadoId(null)}
                      >
                        <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(CATALOGO_FINDER_COLUMN_NOVO_BUTTON_CLASS, "self-end")}
                    title="Nuevo"
                    aria-label="Asociar pintor"
                    disabled={saving}
                    onClick={() => setModalListaPintores(true)}
                  >
                    <Plus className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </AppModal>
      </Dialog>
      {muestraPintorAsociado ? (
        <>
          <SeleccionarPintorModal
            open={modalListaPintores}
            onOpenChange={setModalListaPintores}
            pintores={pintoresDisponibles}
            seleccionadoId={pintorAsociadoId}
            onSelect={(pintor) => {
              setPintorAsociadoId(pintor.id);
              setModalListaPintores(false);
            }}
          />
          <CrearEditarClienteModal
            open={modalFormPintor.open}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setModalFormPintor({ open: false });
            }}
            modo={modalFormPintor.open ? modalFormPintor.modo : "crear"}
            item={modalFormPintor.open ? modalFormPintor.item : null}
            tipoFijo="PINTOR"
            onCatalogoChanged={onCatalogoChanged}
            onSuccess={(creado) => {
              setPintorAsociadoId(creado.id);
              onCatalogoChanged?.();
            }}
          />
        </>
      ) : null}
    </>
  );
}
