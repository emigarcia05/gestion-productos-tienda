"use client";

import { useEffect, useState } from "react";
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
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import {
  crearMktIdeaDetalleAction,
  editarMktIdeaDetalleAction,
} from "@/actions/mktPublicacionesIdeas";
import { cn } from "@/lib/utils";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  seccionId: string;
  seccionNombre: string;
  redes: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  id?: string;
  tituloIdeaInicial?: string;
  detalleInicial?: string;
  redIdsIniciales?: string[];
  tipoContenidoIdInicial?: string;
  usadaInicial?: boolean;
  onSuccess?: () => void;
}

export default function CrearEditarMktIdeaDetalleModal({
  open,
  onOpenChange,
  modo,
  seccionId,
  seccionNombre,
  redes,
  contenidos,
  id,
  tituloIdeaInicial = "",
  detalleInicial = "",
  redIdsIniciales,
  tipoContenidoIdInicial,
  usadaInicial = false,
  onSuccess,
}: Props) {
  const [tituloIdea, setTituloIdea] = useState("");
  const [detalle, setDetalle] = useState("");
  const [redIds, setRedIds] = useState<string[]>([]);
  const [tipoContenidoId, setTipoContenidoId] = useState("");
  const [usada, setUsada] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTituloIdea(modo === "editar" ? tituloIdeaInicial : "");
    setDetalle(modo === "editar" ? detalleInicial : "");
    setRedIds(modo === "editar" ? [...(redIdsIniciales ?? [])] : []);
    setTipoContenidoId(modo === "editar" ? (tipoContenidoIdInicial ?? "") : "");
    setUsada(modo === "editar" ? usadaInicial : false);
  }, [
    open,
    modo,
    tituloIdeaInicial,
    detalleInicial,
    redIdsIniciales,
    tipoContenidoIdInicial,
    usadaInicial,
  ]);

  const puedeGuardar =
    tituloIdea.trim().length > 0 &&
    detalle.trim().length > 0 &&
    redIds.length > 0 &&
    Boolean(tipoContenidoId);

  async function handleSubmit() {
    if (!puedeGuardar || saving) return;
    if (modo === "editar" && !id) return;
    setSaving(true);
    try {
      const res =
        modo === "crear"
          ? await crearMktIdeaDetalleAction({
              seccionId,
              tituloIdea,
              detalle,
              redIds,
              tipoContenidoId,
            })
          : await editarMktIdeaDetalleAction({
              id: id!,
              tituloIdea,
              detalle,
              redIds,
              tipoContenidoId,
              usada,
            });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo guardar.");
        return;
      }
      toast.success(modo === "crear" ? "Detalle creado." : "Detalle actualizado.");
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
        title={modo === "crear" ? "Nuevo Detalle" : "Editar Detalle"}
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
            <ModalMicroLabel>Sección</ModalMicroLabel>
            <p className="text-sm font-medium text-foreground">{seccionNombre}</p>
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
                placeholder={contenidos.length === 0 ? "SIN CONTENIDOS CARGADOS" : "TIPO DE CONTENIDO"}
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
          <Input
            value={tituloIdea}
            onChange={(e) => setTituloIdea(e.target.value.toLocaleUpperCase("es-AR"))}
            placeholder="TITULO"
            disabled={saving}
            aria-label="Título"
            className="h-9"
          />
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            disabled={saving}
            placeholder="DETALLE"
            rows={5}
            aria-label="Detalle"
            className={cn(
              "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50",
              "flex w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
              "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          {modo === "editar" ? (
            <Select
              value={usada ? "SI" : "NO"}
              onValueChange={(v) => setUsada(v === "SI")}
              disabled={saving}
            >
              <SelectTrigger className="w-full" aria-label="Usada">
                <SelectValue placeholder="USADA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO">NO</SelectItem>
                <SelectItem value="SI">SI</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </AppModal>
    </Dialog>
  );
}
