"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import ModalSiNoChoice from "@/components/shared/ModalSiNoChoice";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearMktPublicacionAction } from "@/actions/mktPublicaciones";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fechaIso: string;
  redes: MktCatalogoNombreItem[];
  tipos: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  onSuccess?: () => void;
}

export default function CrearMktPublicacionModal({
  open,
  onOpenChange,
  fechaIso,
  redes,
  tipos,
  contenidos,
  onSuccess,
}: Props) {
  const [redId, setRedId] = useState("");
  const [tipoPublicacionId, setTipoPublicacionId] = useState("");
  const [tipoContenidoId, setTipoContenidoId] = useState("");
  const [publicacion, setPublicacion] = useState("");
  const [contenidoCreado, setContenidoCreado] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRedId("");
    setTipoPublicacionId("");
    setTipoContenidoId("");
    setPublicacion("");
    setContenidoCreado(false);
  }, [open, fechaIso]);

  const puedeGuardar =
    Boolean(fechaIso) &&
    Boolean(redId) &&
    Boolean(tipoPublicacionId) &&
    Boolean(tipoContenidoId) &&
    publicacion.trim().length > 0;

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    try {
      const res = await crearMktPublicacionAction({
        fechaIso,
        redId,
        tipoPublicacionId,
        tipoContenidoId,
        publicacion,
        contenidoCreado,
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo crear la publicación.");
        return;
      }
      toast.success("Publicación creada.");
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
        title="Nueva Publicación"
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
            <ModalMicroLabel>Fecha</ModalMicroLabel>
            <p className="text-sm font-medium text-foreground">
              {fechaIso ? formatIsoYmdDdMmYyyyArgentina(fechaIso) : "—"}
            </p>
          </div>
          <Select
            value={redId || undefined}
            onValueChange={setRedId}
            disabled={saving || redes.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Red">
              <SelectValue placeholder={redes.length === 0 ? "SIN REDES CARGADAS" : "RED"} />
            </SelectTrigger>
            <SelectContent>
              {redes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tipoPublicacionId || undefined}
            onValueChange={setTipoPublicacionId}
            disabled={saving || tipos.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Tipo de publicación">
              <SelectValue
                placeholder={tipos.length === 0 ? "SIN TIPOS CARGADOS" : "TIPO DE PUBLICACION"}
              />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tipoContenidoId || undefined}
            onValueChange={setTipoContenidoId}
            disabled={saving || contenidos.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Tipo de contenido">
              <SelectValue
                placeholder={
                  contenidos.length === 0 ? "SIN CONTENIDOS CARGADOS" : "TIPO DE CONTENIDO"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {contenidos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <textarea
            value={publicacion}
            onChange={(e) => setPublicacion(e.target.value)}
            disabled={saving}
            placeholder="PUBLICACION"
            rows={5}
            aria-label="Publicación"
            className={cn(
              "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
              "flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
              "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Contenido Creado</ModalMicroLabel>
            <ModalSiNoChoice
              value={contenidoCreado}
              onChange={setContenidoCreado}
              disabled={saving}
            />
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
