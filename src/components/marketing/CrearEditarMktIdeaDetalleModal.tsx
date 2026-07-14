"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import type { MktCatalogoNombreItem } from "@/lib/mktPublicacionesCatalogo";
import {
  crearMktIdeaDetalleAction,
  editarMktIdeaDetalleAction,
} from "@/actions/mktPublicacionesIdeas";
import { cn } from "@/lib/utils";

function MultiSelectCatalogo({
  opciones,
  selectedIds,
  onChange,
  placeholder,
  emptyPlaceholder,
  ariaLabel,
  disabled,
}: {
  opciones: MktCatalogoNombreItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  emptyPlaceholder: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => opciones.filter((o) => selectedSet.has(o.id)),
    [opciones, selectedSet]
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function toggle(id: string) {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    onChange([...selectedIds, id]);
  }

  const label =
    opciones.length === 0
      ? emptyPlaceholder
      : selectedItems.length === 0
        ? placeholder
        : selectedItems.length === 1
          ? selectedItems[0]!.nombre
          : `${selectedItems.length} seleccionadas`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled || opciones.length === 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-1 text-left text-sm shadow-xs outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          selectedItems.length === 0 && "text-muted-foreground"
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && opciones.length > 0 ? (
        <div
          className="absolute top-full left-0 z-50 mt-1 max-h-48 min-w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
          aria-multiselectable="true"
        >
          {opciones.map((item) => {
            const checked = selectedSet.has(item.id);
            return (
              <label
                key={item.id}
                role="option"
                aria-selected={checked}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted",
                  checked && "bg-muted"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                  aria-label={item.nombre}
                />
                <span className="min-w-0 truncate">{item.nombre}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: "crear" | "editar";
  seccionId: string;
  seccionNombre: string;
  redes: MktCatalogoNombreItem[];
  tipos: MktCatalogoNombreItem[];
  contenidos: MktCatalogoNombreItem[];
  id?: string;
  tituloIdeaInicial?: string;
  detalleInicial?: string;
  redIdsIniciales?: string[];
  tipoPublicacionIdsIniciales?: string[];
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
  tipos,
  contenidos,
  id,
  tituloIdeaInicial = "",
  detalleInicial = "",
  redIdsIniciales,
  tipoPublicacionIdsIniciales,
  tipoContenidoIdInicial,
  usadaInicial = false,
  onSuccess,
}: Props) {
  const [tituloIdea, setTituloIdea] = useState("");
  const [detalle, setDetalle] = useState("");
  const [redIds, setRedIds] = useState<string[]>([]);
  const [tipoPublicacionIds, setTipoPublicacionIds] = useState<string[]>([]);
  const [tipoContenidoId, setTipoContenidoId] = useState("");
  const [usada, setUsada] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTituloIdea(modo === "editar" ? tituloIdeaInicial : "");
    setDetalle(modo === "editar" ? detalleInicial : "");
    setRedIds(modo === "editar" ? [...(redIdsIniciales ?? [])] : []);
    setTipoPublicacionIds(modo === "editar" ? [...(tipoPublicacionIdsIniciales ?? [])] : []);
    setTipoContenidoId(modo === "editar" ? (tipoContenidoIdInicial ?? "") : "");
    setUsada(modo === "editar" ? usadaInicial : false);
  }, [
    open,
    modo,
    tituloIdeaInicial,
    detalleInicial,
    redIdsIniciales,
    tipoPublicacionIdsIniciales,
    tipoContenidoIdInicial,
    usadaInicial,
  ]);

  const puedeGuardar =
    tituloIdea.trim().length > 0 &&
    detalle.trim().length > 0 &&
    redIds.length > 0 &&
    tipoPublicacionIds.length > 0 &&
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
              tipoPublicacionIds,
              tipoContenidoId,
            })
          : await editarMktIdeaDetalleAction({
              id: id!,
              tituloIdea,
              detalle,
              redIds,
              tipoPublicacionIds,
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
          <MultiSelectCatalogo
            opciones={redes}
            selectedIds={redIds}
            onChange={setRedIds}
            placeholder="RED"
            emptyPlaceholder="SIN REDES CARGADAS"
            ariaLabel="Redes"
            disabled={saving}
          />
          <MultiSelectCatalogo
            opciones={tipos}
            selectedIds={tipoPublicacionIds}
            onChange={setTipoPublicacionIds}
            placeholder="TIPO DE PUBLICACION"
            emptyPlaceholder="SIN TIPOS CARGADOS"
            ariaLabel="Tipos de publicación"
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
            onChange={(e) => setTituloIdea(e.target.value)}
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
