"use client";

import { useEffect, useMemo, useState } from "react";
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
  tipos: MktCatalogoNombreItem[];
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
  tipos,
  contenidos,
  seccionesIdeas,
  item = null,
  onSuccess,
}: Props) {
  const [redId, setRedId] = useState("");
  const [tipoPublicacionId, setTipoPublicacionId] = useState("");
  const [tipoContenidoId, setTipoContenidoId] = useState("");
  const [seccionId, setSeccionId] = useState("");
  const [ideaDetalleId, setIdeaDetalleId] = useState("");
  const [contenidoCreado, setContenidoCreado] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && item) {
      setRedId(item.redId);
      setTipoPublicacionId(item.tipoPublicacionId);
      setTipoContenidoId(item.tipoContenidoId);
      setSeccionId(item.ideaSeccionId ?? "");
      setIdeaDetalleId(item.ideaDetalleId ?? "");
      setContenidoCreado(item.contenidoCreado);
      return;
    }
    setRedId("");
    setTipoPublicacionId("");
    setTipoContenidoId("");
    setSeccionId("");
    setIdeaDetalleId("");
    setContenidoCreado(false);
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
  }

  const puedeGuardar =
    Boolean(fechaIso) &&
    Boolean(redId) &&
    Boolean(tipoPublicacionId) &&
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
              redId,
              tipoPublicacionId,
              tipoContenidoId,
              ideaDetalleId,
              contenidoCreado,
            })
          : await editarMktPublicacionAction({
              id: item!.id,
              fechaIso,
              redId,
              tipoPublicacionId,
              tipoContenidoId,
              ideaDetalleId,
              contenidoCreado,
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
          </section>

          <section className="flex flex-col gap-3 py-4" aria-labelledby="mkt-pub-sec-contenido">
            <h3
              id="mkt-pub-sec-contenido"
              className="text-xs font-bold uppercase tracking-wide text-primary"
            >
              Contenido
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
                    {idea.tituloIdea.toLocaleUpperCase("es-AR")}
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

          <section className="flex flex-col gap-3 pt-4" aria-labelledby="mkt-pub-sec-creado">
            <h3
              id="mkt-pub-sec-creado"
              className="text-xs font-bold uppercase tracking-wide text-primary"
            >
              Contenido Creado
            </h3>
            <ModalSiNoChoice
              value={contenidoCreado}
              onChange={setContenidoCreado}
              disabled={saving}
            />
          </section>
        </div>
      </AppModal>
    </Dialog>
  );
}
