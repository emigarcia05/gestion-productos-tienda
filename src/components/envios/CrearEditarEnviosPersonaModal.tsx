"use client";

import { useEffect, useState } from "react";
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
import { crearEnviosPersonaAction, editarEnviosPersonaAction } from "@/actions/envios";
import {
  ENVIOS_PERSONA_TIPO_LABELS,
  ENVIOS_PERSONA_TIPO_VALUES,
  type EnviosPersonaItem,
  type EnviosPersonaTipoValue,
} from "@/lib/envios";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  item?: EnviosPersonaItem | null;
  /** Si está definido, el tipo no se elige en el formulario. */
  tipoFijo?: EnviosPersonaTipoValue;
  onSuccess?: (item: EnviosPersonaItem) => void;
}

export default function CrearEditarEnviosPersonaModal({
  open,
  onOpenChange,
  modo,
  item = null,
  tipoFijo,
  onSuccess,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cel, setCel] = useState("");
  const [tipo, setTipo] = useState<EnviosPersonaTipoValue | "">(tipoFijo ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setNombre(item.nombre);
      setApellido(item.apellido);
      setCel(item.cel);
      setTipo(tipoFijo ?? item.tipo);
      return;
    }
    setNombre("");
    setApellido("");
    setCel("");
    setTipo(tipoFijo ?? "");
  }, [open, modo, item, tipoFijo]);

  const puedeGuardar =
    nombre.trim() !== "" && apellido.trim() !== "" && cel.trim() !== "" && tipo !== "";

  async function handleSubmit() {
    if (!puedeGuardar || tipo === "" || saving) return;
    setSaving(true);
    try {
      const payload = { nombre, apellido, cel, tipo };
      const res =
        modo === "editar" && item
          ? await editarEnviosPersonaAction({ id: item.id, ...payload })
          : await crearEnviosPersonaAction(payload);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "editar" ? "Persona actualizada." : "Persona creada.");
      onOpenChange(false);
      onSuccess?.(res.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <AppModal
        title={modo === "editar" ? "Editar Cliente" : "Nuevo Cliente"}
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
              <Select value={tipo} onValueChange={(v) => setTipo(v as EnviosPersonaTipoValue)}>
                <SelectTrigger>
                  <SelectValue placeholder="ELEGIR TIPO..." />
                </SelectTrigger>
                <SelectContent className="select-content-filtro" position="popper" side="bottom" align="start">
                  {ENVIOS_PERSONA_TIPO_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ENVIOS_PERSONA_TIPO_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </AppModal>
    </Dialog>
  );
}
