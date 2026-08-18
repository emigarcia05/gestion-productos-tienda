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
import { crearClienteAction, editarClienteAction } from "@/actions/envios";
import {
  CLIENTE_TIPO_LABELS,
  CLIENTE_TIPO_VALUES,
  nombreCompletoCliente,
  type ClienteItem,
  type ClienteTipoValue,
} from "@/lib/envios";
import { cn } from "@/lib/utils";

const SENTINEL_NONE = "none";

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
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cel, setCel] = useState("");
  const [tipo, setTipo] = useState<ClienteTipoValue | "">(tipoFijo ?? "");
  const [pintorAsociadoId, setPintorAsociadoId] = useState(SENTINEL_NONE);
  const [saving, setSaving] = useState(false);
  const [modalPintor, setModalPintor] = useState(false);

  const tipoEfectivo = tipoFijo ?? tipo;
  const muestraPintorAsociado = tipoEfectivo === "FINAL";

  const pintoresDisponibles = useMemo(
    () => pintores.filter((p) => p.tipo === "PINTOR" && p.id !== item?.id),
    [pintores, item?.id]
  );

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setNombre(item.nombre);
      setApellido(item.apellido);
      setCel(item.cel);
      setTipo(tipoFijo ?? item.tipo);
      setPintorAsociadoId(item.pintorAsociadoId ?? SENTINEL_NONE);
      return;
    }
    setNombre("");
    setApellido("");
    setCel("");
    setTipo(tipoFijo ?? "");
    setPintorAsociadoId(SENTINEL_NONE);
  }, [open, modo, item, tipoFijo]);

  const puedeGuardar =
    nombre.trim() !== "" &&
    apellido.trim() !== "" &&
    cel.trim() !== "" &&
    (tipoFijo != null || tipo === "FINAL" || tipo === "PINTOR");
  const tituloBase = tipoFijo === "PINTOR" || tipoEfectivo === "PINTOR" ? "Pintor" : "Cliente";

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    const tipoGuardar = tipoFijo ?? tipo;
    if (tipoGuardar !== "FINAL" && tipoGuardar !== "PINTOR") return;
    setSaving(true);
    try {
      const payload = {
        nombre,
        apellido,
        cel,
        tipo: tipoGuardar,
        pintorAsociadoId:
          tipoGuardar === "FINAL" && pintorAsociadoId !== SENTINEL_NONE ? pintorAsociadoId : null,
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
              <ModalMicroLabel>NOMBRE</ModalMicroLabel>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
            </label>
            <label className="flex flex-col gap-1">
              <ModalMicroLabel>APELLIDO</ModalMicroLabel>
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} autoComplete="off" />
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
                    if (next === "PINTOR") setPintorAsociadoId(SENTINEL_NONE);
                  }}
                >
                  <SelectTrigger>
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
                <Select value={pintorAsociadoId} onValueChange={setPintorAsociadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="SIN PINTOR..." />
                  </SelectTrigger>
                  <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                    <SelectItem value={SENTINEL_NONE}>SIN PINTOR</SelectItem>
                    {pintoresDisponibles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {nombreCompletoCliente(p)} · {p.cel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("self-start")}
                  disabled={saving}
                  onClick={() => setModalPintor(true)}
                >
                  Nuevo Pintor
                </Button>
              </div>
            ) : null}
          </div>
        </AppModal>
      </Dialog>
      {muestraPintorAsociado ? (
        <CrearEditarClienteModal
          open={modalPintor}
          onOpenChange={setModalPintor}
          modo="crear"
          tipoFijo="PINTOR"
          onSuccess={(creado) => {
            setPintorAsociadoId(creado.id);
            onCatalogoChanged?.();
          }}
        />
      ) : null}
    </>
  );
}
