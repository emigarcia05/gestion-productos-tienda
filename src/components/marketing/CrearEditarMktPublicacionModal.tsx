"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import MktMultiSelectCatalogo from "@/components/marketing/MktMultiSelectCatalogo";
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
  crearMktPublicacionAction,
  editarMktPublicacionAction,
} from "@/actions/mktPublicaciones";
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import type { MktIdeaSeccionItem } from "@/lib/mktPublicacionesIdeas";
import type { MktPublicacionCalendarioItem } from "@/lib/mktPublicaciones";
import { formatIsoYmdDdMmYyyyArgentina } from "@/lib/fechaArgentina";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  fechaIso: string;
  redes: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  seccionesIdeas: MktIdeaSeccionItem[];
  /** Obligatorio en modo editar. */
  item?: MktPublicacionCalendarioItem | null;
  onSuccess?: () => void;
}

export default function CrearEditarMktPublicacionModal({
  open,
  onOpenChange,
  modo,
  fechaIso,
  redes,
  contenidos,
  seccionesIdeas,
  item = null,
  onSuccess,
}: Props) {
  const [redIds, setRedIds] = useState<string[]>([]);
  const [tipoContenidoId, setTipoContenidoId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [ideaDetalleId, setIdeaDetalleId] = useState("");
  const [contenidoUrl, setContenidoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setRedIds([...item.redIds]);
      setTipoContenidoId(item.tipoContenidoId);
      setSeccionId(item.ideaSeccionId ?? "");
      setIdeaDetalleId(item.ideaDetalleId ?? "");
      setContenidoUrl(item.contenidoUrl ?? "");
      return;
    }
    setRedIds([]);
    setTipoContenidoId("");
    setSeccionId("");
    setIdeaDetalleId("");
    setContenidoUrl("");
  }, [open, modo, fechaIso, item]);

  const ideasDisponibles = useMemo(() => {
    const seccion = seccionesIdeas.find((s) => s.id === seccionId);
    if (!seccion) return [];
    return seccion.detalles
      .filter((d) => !d.usada || d.id === ideaDetalleId)
      .slice()
      .sort((a, b) => a.tituloIdea.localeCompare(b.tituloIdea, "es"));
  }, [seccionesIdeas, seccionId, ideaDetalleId]);

  /** Solo lectura: `detalle` de `mkt_publi_ideas_detalle`. */
  const detalleIdea = useMemo(() => {
    if (!ideaDetalleId) return "";
    for (const seccion of seccionesIdeas) {
      const idea = seccion.detalles.find((d) => d.id === ideaDetalleId);
      if (idea) return idea.detalle.trim();
    }
    return modo === "editar" ? (item?.publicacion.trim() ?? "") : "";
  }, [ideaDetalleId, seccionesIdeas, modo, item]);

  function handleSeccionChange(nextSeccionId: string) {
    setSeccionId(nextSeccionId);
    setIdeaDetalleId("");
  }

  function handleIdeaChange(nextIdeaId: string) {
    setIdeaDetalleId(nextIdeaId);
    const seccion = seccionesIdeas.find((s) => s.id === seccionId);
    const idea = seccion?.detalles.find((d) => d.id === nextIdeaId);
    if (!idea) return;
    setTipoContenidoId(idea.tipoContenidoId);
    if (idea.redIds.length > 0) {
      setRedIds([...idea.redIds]);
    }
  }

  const puedeGuardar =
    Boolean(fechaIso) &&
    redIds.length > 0 &&
    Boolean(tipoContenidoId) &&
    Boolean(seccionId) &&
    Boolean(ideaDetalleId) &&
    detalleIdea.length > 0 &&
    (modo === "crear" || Boolean(item?.id));

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    setSaving(true);
    try {
      const res =
        modo === "crear"
          ? await crearMktPublicacionAction({
              fechaIso,
              redIds,
              tipoContenidoId,
              ideaDetalleId,
              contenidoUrl: contenidoUrl.trim(),
            })
          : await editarMktPublicacionAction({
              id: item!.id,
              fechaIso,
              redIds,
              tipoContenidoId,
              ideaDetalleId,
              contenidoUrl: contenidoUrl.trim(),
            });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "crear" ? "Publicación creada." : "Publicación actualizada.");
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
        title={modo === "crear" ? "Nueva Publicación" : "Editar Publicación"}
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
        <div className="flex flex-col divide-y divide-primary/25">
          <section className="flex flex-col gap-3 pb-4" aria-labelledby="mkt-pub-sec-publicacion">
            <h3
              id="mkt-pub-sec-publicacion"
              className="text-xs font-bold uppercase tracking-wide text-primary"
            >
              Publicación
            </h3>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Fecha</ModalMicroLabel>
              <p className="text-sm font-medium text-foreground">
                {fechaIso ? formatIsoYmdDdMmYyyyArgentina(fechaIso) : "—"}
              </p>
            </div>
            <MktMultiSelectCatalogo
              opciones={redes}
              selectedIds={redIds}
              onChange={setRedIds}
              placeholder="RED"
              emptyPlaceholder="SIN REDES CARGADAS"
              ariaLabel="Redes"
              disabled={saving}
            />
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
          </section>

          <section className="flex flex-col gap-3 py-4" aria-labelledby="mkt-pub-sec-idea">
            <h3
              id="mkt-pub-sec-idea"
              className="text-xs font-bold uppercase tracking-wide text-primary"
            >
              Idea
            </h3>
            <Select
              value={seccionId || undefined}
              onValueChange={handleSeccionChange}
              disabled={saving || seccionesIdeas.length === 0}
            >
              <SelectTrigger className="w-full" aria-label="Sección">
                <SelectValue
                  placeholder={
                    seccionesIdeas.length === 0 ? "SIN SECCIONES CARGADAS" : "SECCION"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {seccionesIdeas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ideaDetalleId || undefined}
              onValueChange={handleIdeaChange}
              disabled={saving || !seccionId || ideasDisponibles.length === 0}
            >
              <SelectTrigger className="w-full" aria-label="Idea">
                <SelectValue
                  placeholder={
                    !seccionId
                      ? "ELEGIR SECCION"
                      : ideasDisponibles.length === 0
                        ? "SIN IDEAS DISPONIBLES"
                        : "IDEA"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {ideasDisponibles.map((idea) => (
                  <SelectItem key={idea.id} value={idea.id}>
                    {idea.tituloIdea}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>Detalle</ModalMicroLabel>
              <p
                className="min-h-[5.5rem] whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                aria-label="Detalle de la idea"
              >
                {detalleIdea || "Seleccioná una idea para ver el detalle."}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-3 pt-4" aria-labelledby="mkt-pub-sec-contenido">
            <h3
              id="mkt-pub-sec-contenido"
              className="text-xs font-bold uppercase tracking-wide text-primary"
            >
              Contenido
            </h3>
            <div className="flex flex-col gap-1">
              <ModalMicroLabel>URL (Google Drive)</ModalMicroLabel>
              <Input
                type="url"
                value={contenidoUrl}
                onChange={(e) => setContenidoUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                disabled={saving}
                aria-label="URL del contenido"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Vacío = contenido planificado. Con URL = contenido creado.
              </p>
            </div>
          </section>
        </div>
      </AppModal>
    </Dialog>
  );
}
