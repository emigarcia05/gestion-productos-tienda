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
import {
  crearMktContenidoUrlDriveAction,
  editarMktContenidoUrlDriveAction,
} from "@/actions/mktContenidoUrlDrive";
import type {
  MktContenidoDriveTipoItem,
  MktContenidoUrlDriveItem,
} from "@/lib/mktContenidoUrlDrive";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  item?: MktContenidoUrlDriveItem | null;
  tipos: MktContenidoDriveTipoItem[];
  onSuccess?: () => void;
}

export default function CrearEditarMktContenidoUrlDriveModal({
  open,
  onOpenChange,
  modo,
  item = null,
  tipos,
  onSuccess,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [url, setUrl] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setNombre(item.nombre);
      setDescripcion(item.descripcion);
      setUrl(item.url);
      setTipoId(item.tipoId);
      return;
    }
    setNombre("");
    setDescripcion("");
    setUrl("");
    setTipoId("");
  }, [open, modo, item]);

  const puedeGuardar =
    nombre.trim().length > 0 &&
    url.trim().length > 0 &&
    Boolean(tipoId) &&
    (modo === "crear" || Boolean(item?.id));

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        url: url.trim(),
        tipoId,
      };
      const res =
        modo === "crear"
          ? await crearMktContenidoUrlDriveAction(payload)
          : await editarMktContenidoUrlDriveAction({ id: item!.id, ...payload });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "crear" ? "Registro creado." : "Registro actualizado.");
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title={modo === "crear" ? "Nuevo Contenido" : "Editar Contenido"}
        size="md"
        className="max-w-lg"
        scrollBody
        hideBodyScrollbars
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !puedeGuardar}
              onClick={() => void handleSubmit()}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Nombre</ModalMicroLabel>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toLocaleUpperCase("es-AR"))}
              placeholder="NOMBRE"
              disabled={saving}
              autoFocus
              aria-label="Nombre"
            />
          </div>
          <Select
            value={tipoId || undefined}
            onValueChange={setTipoId}
            disabled={saving || tipos.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Tipo de contenido">
              <SelectValue
                placeholder={
                  tipos.length === 0 ? "SIN TIPOS CARGADOS" : "TIPO DE CONTENIDO"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Descripción</ModalMicroLabel>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="DESCRIPCION"
              disabled={saving}
              rows={4}
              aria-label="Descripción"
              className={cn(
                "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
                "flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>URL (Google Drive)</ModalMicroLabel>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={saving}
              aria-label="URL de Google Drive"
              autoComplete="off"
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
